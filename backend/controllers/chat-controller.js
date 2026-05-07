const { uploadFileToCloudinary } = require("../config/cloudinary-config");
const response = require("../utils/response-handler");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;
    console.log(file);
    const participants = [senderId, receiverId];

    // ✅ FIX: correct array query
    let conversation = await Conversation.findOne({
      participants: { $all: participants },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
      });
    }

    let media = null;
    let contentType = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "Upload failed");
      }

      media = uploadFile.secure_url;

      contentType = file.mimetype.startsWith("image") ? "image" : "video";
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message required");
    }

    // ✅ FIX: create message properly
    const message = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      media,
      messageStatus,
    });

    // ✅ ALWAYS update lastMessage
    conversation.lastMessage = message._id;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "userName profilePicture")
      .populate("receiver", "userName profilePicture");

    // socket emit
    if (req.io && req.socketUserMap) {
      const receiverSocket = req.socketUserMap.get(receiverId);

      if (receiverSocket) {
        req.io.to(receiverSocket).emit("receiver_message", populatedMessage);

        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 200, "Message sent", populatedMessage);
  } catch (err) {
    console.error(err);
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
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return response(res, 404, "Not found");
    }

    const messages = await Message.find({
      conversationId,
    })
      .populate("sender", "userName profilePicture")
      .populate("receiver", "userName profilePicture")
      .sort({ createdAt: 1 });

    // mark read
    await Message.updateMany(
      {
        conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      { messageStatus: "read" },
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, "Messages", messages);
  } catch (err) {
    return response(res, 500, "Server error");
  }
};

const markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.userId;
  try {
    let messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });

    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: userId },
      { $set: { messageStatus: "read" } },
    );

    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updatedMessages = {
            _id: message._id,
            messageStatus: "read",
          };
          req.io.to(senderSocketId).emit("message_read", updatedMessages);
          await message.save();
        }
      }
    }
    return response(res, 200, "Message marked as read", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
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
    if (req.io && req.socketUserMap) {
      const reciverSocketId = req.socketUserMap.get(
        message.receiver.toString(),
      );
      if (reciverSocketId) {
        req.io.to(reciverSocketId).emit("message_deleted", messageId);
      }
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
