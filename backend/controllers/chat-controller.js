const { uploadFileToCloudinary } = require("../config/cloudinary-config");
const response = require("../utils/response-handler");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    const file = req.file;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        unreadCount: 0,
      });
    }

    let media = null;
    let contentType = null;

    if (file) {
      const upload = await uploadFileToCloudinary(file);
      media = upload.secure_url;
      contentType = file.mimetype.startsWith("image") ? "image" : "video";
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message required");
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      media,
      messageStatus: "send",
    });

    conversation.lastMessage = message._id;
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    const populated = await Message.findById(message._id).populate(
      "sender receiver",
      "userName profilePicture",
    );

    // Use room-based delivery (io.to(userId)) instead of socketUserMap lookups.
    // socket-server.js does socket.join(userId) on connect, so this always works
    // regardless of which socket instance the user is on.
    if (req.io) {
      // Emit to receiver
      req.io.to(receiverId).emit("receiver_message", populated);

      // Emit back to sender so their own optimistic message gets replaced correctly
      req.io.to(senderId).emit("receiver_message", populated);

      // Mark as delivered since we just pushed to the receiver's room
      message.messageStatus = "delivered";
      await message.save();

      // Let the sender know delivery status updated
      req.io.to(senderId).emit("message_status_update", {
        messageId: message._id,
        messageStatus: "delivered",
      });
    }

    return response(res, 200, "Message sent", populated);
  } catch (err) {
    console.log(err);
    return response(res, 500, "Server error");
  }
};

const getConversation = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversation = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "userName profilePicture")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "userName profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 200, "Conversations fetched", conversation);
  } catch (err) {
    return response(res, 500, "Server error");
  }
};

const getMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const messages = await Message.find({ conversationId })
      .populate("sender receiver", "userName profilePicture")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      { messageStatus: "read" },
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      unreadCount: 0,
    });

    return response(res, 200, "ok", messages);
  } catch (err) {
    return response(res, 500, "error");
  }
};

const markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.userId;

  try {
    const messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });

    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: userId },
      { messageStatus: "read" },
    );

    await Conversation.updateMany({ participants: userId }, { unreadCount: 0 });

    // Notify each sender that their message was read.
    // Uses room-based delivery — no socketUserMap needed.
    if (req.io) {
      messages.forEach((msg) => {
        req.io.to(msg.sender.toString()).emit("message_read", {
          _id: msg._id,
          messageStatus: "read",
        });
      });
    }

    return response(res, 200, "Marked as read");
  } catch (err) {
    console.log(err);
    return response(res, 500, "Error");
  }
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return response(res, 404, "Message not found");
    }

    if (message.sender.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this message");
    }

    await message.deleteOne();

    // Notify receiver using room — no socketUserMap needed.
    if (req.io) {
      req.io.to(message.receiver.toString()).emit("message_deleted", {
        messageId,
      });
    }

    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getMessage,
  markAsRead,
  deleteMessage,
};
