const { Server } = require("socket.io");
const User = require("../models/user");
const Message = require("../models/message");
const socketMiddleware = require("../middleware/socketMiddleware");

const onlineUsers = new Map();
// userId -> Set(socketIds)

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(socketMiddleware);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    if (!userId) return;

    socket.join(userId);

    // ================= ONLINE =================
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socket.id);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: null,
    });

    // Broadcast updated status to everyone
    io.emit("user_status", {
      userId,
      isOnline: true,
      lastSeen: null,
    });

    // Send snapshot of ALL currently online users to the newly connected client
    // so they don't have an empty onlineUsers map on first load
    const snapshot = [];
    for (const [uid] of onlineUsers) {
      snapshot.push({ userId: uid, isOnline: true, lastSeen: null });
    }
    socket.emit("online_users_snapshot", snapshot);

    console.log("CONNECTED:", userId);

    // ================= TYPING =================
    socket.on("start_typing", ({ conversationId, receiverId }) => {
      io.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("stop_typing", ({ conversationId, receiverId }) => {
      io.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    // ================= MESSAGE DELIVERY =================
    // Note: primary message sending goes through REST (chat-controller).
    // This handler exists as a fallback / for direct socket sends if needed.
    socket.on("send_message", async (message) => {
      const receiverId = message.receiver?._id || message.receiver;
      const senderId = message.sender?._id || message.sender;

      io.to(receiverId).emit("receiver_message", message);

      await Message.findByIdAndUpdate(message._id, {
        messageStatus: "delivered",
      });

      io.to(receiverId).emit("message_status_update", {
        messageId: message._id,
        messageStatus: "delivered",
      });

      io.to(senderId).emit("message_status_update", {
        messageId: message._id,
        messageStatus: "delivered",
      });
    });

    // ================= REACTIONS =================
    socket.on("add_reactions", async ({ messageId, emoji }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const index = message.reactions.findIndex(
          (r) => r.user.toString() === userId,
        );

        if (index > -1) {
          if (message.reactions[index].emoji === emoji) {
            // Same emoji tapped again — remove it (toggle off)
            message.reactions.splice(index, 1);
          } else {
            // Different emoji — replace
            message.reactions[index].emoji = emoji;
          }
        } else {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        const updated = await Message.findById(messageId).populate(
          "reactions.user",
          "userName",
        );

        // Emit to both sender and receiver using room-based delivery
        io.to(message.sender.toString()).emit("reaction_update", {
          messageId,
          reactions: updated.reactions,
        });

        io.to(message.receiver.toString()).emit("reaction_update", {
          messageId,
          reactions: updated.reactions,
        });
      } catch (err) {
        console.log(err);
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", async () => {
      const sockets = onlineUsers.get(userId);
      if (!sockets) return;

      sockets.delete(socket.id);

      if (sockets.size === 0) {
        onlineUsers.delete(userId);

        const lastSeen = new Date();

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen,
        });

        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen,
        });
      }

      console.log("DISCONNECTED:", userId);
    });
  });

  return io;
};

module.exports = initializeSocket;
