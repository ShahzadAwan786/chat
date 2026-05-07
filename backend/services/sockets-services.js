const { Server } = require("socket.io");
const User = require("../models/user");
const Message = require("../models/message");
const socketMiddleware = require("../middleware/socketMiddleware");

const onlineUsers = new Map();
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.use(socketMiddleware);
  io.on("connection", (socket) => {
    console.log("CONNECTED:", socket.id);

    // ================= CONNECT USER =================
    socket.on("user_connected", async (userId) => {
      try {
        socket.userId = userId;

        onlineUsers.set(userId, socket.id);

        socket.join(userId);

        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: null,
        });

        io.emit("user_status", {
          userId,
          isOnline: true,
          lastSeen: null,
        });
      } catch (error) {
        console.log(error);
      }
    });

    // ================= TYPING =================
    socket.on("start_typing", ({ conversationId, receiverId }) => {
      if (!socket.userId || !conversationId || !receiverId) return;

      if (!typingUsers.has(socket.userId)) {
        typingUsers.set(socket.userId, {});
      }

      const userTyping = typingUsers.get(socket.userId);

      userTyping[conversationId] = true;

      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;

        io.to(receiverId).emit("user_typing", {
          userId: socket.userId,
          conversationId,
          isTyping: false,
        });
      }, 2000);

      io.to(receiverId).emit("user_typing", {
        userId: socket.userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("stop_typing", ({ conversationId, receiverId }) => {
      if (!socket.userId || !conversationId || !receiverId) return;

      if (typingUsers.has(socket.userId)) {
        const userTyping = typingUsers.get(socket.userId);

        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);

          delete userTyping[`${conversationId}_timeout`];
        }

        io.to(receiverId).emit("user_typing", {
          userId: socket.userId,
          conversationId,
          isTyping: false,
        });
      }
    });

    // ================= REACTION =================
    socket.on("add_reactions", async ({ messageId, emoji, userId }) => {
      try {
        const message = await Message.findById(messageId);

        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          (r) => r.user.toString() === userId,
        );

        if (existingIndex > -1) {
          const existing = message.reactions[existingIndex];

          if (existing.emoji === emoji) {
            message.reactions.splice(existingIndex, 1);
          } else {
            message.reactions[existingIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({
            user: userId,
            emoji,
          });
        }

        await message.save();

        const populated = await Message.findById(message._id).populate(
          "reactions.user",
          "userName",
        );

        const payload = {
          messageId,
          reactions: populated.reactions,
        };

        io.emit("reaction_update", payload);
      } catch (error) {
        console.log(error);
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", async () => {
      try {
        const userId = socket.userId;

        if (!userId) return;

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

        console.log("DISCONNECTED:", userId);
      } catch (error) {
        console.log(error);
      }
    });
  });

  io.socketUserMap = onlineUsers;

  return io;
};

module.exports = initializeSocket;
