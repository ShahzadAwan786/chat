import { create } from "zustand";
import { getSocket } from "../services/chat-services";
import axiosInstance from "../services/api";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  currentUser: null,

  loading: false,
  error: null,

  onlineUsers: new Map(),
  typingUsers: new Map(),

  // ================= SOCKET =================
  initSocketListeners: () => {
    const socket = getSocket();

    if (!socket) return;

    socket.off("receiver_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_status_update");
    socket.off("reaction_update");
    socket.off("message_deleted");
    socket.off("message_read");

    // RECEIVE MESSAGE
    socket.on("receiver_message", (message) => {
      get().receiveMessage(message);
    });

    // USER STATUS
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const updated = new Map(state.onlineUsers);

        updated.set(userId, {
          isOnline,
          lastSeen,
        });

        return {
          onlineUsers: updated,
        };
      });
    });

    // TYPING
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const updated = new Map(state.typingUsers);

        if (!updated.has(conversationId)) {
          updated.set(conversationId, new Set());
        }

        const typingSet = updated.get(conversationId);

        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }

        return {
          typingUsers: updated,
        };
      });
    });

    // MESSAGE STATUS
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg,
        ),
      }));
    });

    // MESSAGE READ
    socket.on("message_read", ({ _id, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === _id ? { ...msg, messageStatus } : msg,
        ),
      }));
    });

    // REACTION
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg,
        ),
      }));
    });

    // DELETE
    socket.on("message_deleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });
  },

  // ================= USER =================
  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  // ================= CONVERSATIONS =================
  fetchConversation: async () => {
    try {
      set({
        loading: true,
        error: null,
      });

      const { data } = await axiosInstance.get("/chats/conversation");

      set({
        conversations: data?.data || [],
        loading: false,
      });

      return data?.data || [];
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || error.message,
      });

      return [];
    }
  },

  // ================= FETCH MESSAGES =================
  fetchMessages: async (conversationId) => {
    if (!conversationId) return;

    try {
      set({
        loading: true,
        error: null,
      });

      const { data } = await axiosInstance.get(
        `/chats/conversation/${conversationId}/messages`,
      );

      set({
        messages: data?.data || [],
        currentConversation: conversationId,
        loading: false,
      });

      get().markMessageAsRead();

      return data?.data || [];
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || error.message,
      });

      return [];
    }
  },

  // ================= SEND =================
  sendMessage: async (formData) => {
    try {
      const senderId = formData.get("senderId");
      const receiverId = formData.get("receiverId");
      const content = formData.get("content");
      const media = formData.get("media");

      const tempId = `temp-${Date.now()}`;

      const optimisticMessage = {
        _id: tempId,
        sender: {
          _id: senderId,
        },
        receiver: {
          _id: receiverId,
        },
        content,
        media: media instanceof File ? URL.createObjectURL(media) : null,
        messageStatus: "sending",
        createdAt: new Date().toISOString(),
      };

      // optimistic
      set((state) => ({
        messages: [...state.messages, optimisticMessage],
      }));

      const { data } = await axiosInstance.post(
        "/chats/send-message",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const savedMessage = data?.data;

      // replace temp
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? savedMessage : msg,
        ),
      }));

      get().fetchConversation();

      return savedMessage;
    } catch (error) {
      console.log(error);
    }
  },

  // ================= RECEIVE =================
  receiveMessage: (message) => {
    if (!message) return;

    set((state) => {
      const exists = state.messages.some((msg) => msg._id === message._id);

      if (exists) return state;

      return {
        messages: [...state.messages, message],
      };
    });

    get().fetchConversation();
    get().markMessageAsRead();
  },

  // ================= READ =================
  markMessageAsRead: async () => {
    try {
      const { messages, currentUser } = get();

      if (!messages.length || !currentUser) return;

      const unreadIds = messages
        .filter(
          (msg) =>
            msg.receiver?._id === currentUser._id &&
            msg.messageStatus !== "read",
        )
        .map((msg) => msg._id);

      if (!unreadIds.length) return;

      await axiosInstance.put("/chats/messages/read", {
        messageIds: unreadIds,
      });

      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id)
            ? {
                ...msg,
                messageStatus: "read",
              }
            : msg,
        ),
      }));
    } catch (error) {
      console.log(error);
    }
  },

  // ================= DELETE =================
  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);

      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    } catch (error) {
      console.log(error);
    }
  },

  // ================= REACTION =================
  addReaction: (messageId, emoji, userId) => {
    const socket = getSocket();

    socket?.emit("add_reactions", {
      messageId,
      emoji,
      userId,
    });
  },

  // ================= TYPING =================
  startTyping: (receiverId) => {
    const socket = getSocket();

    const { currentConversation } = get();

    socket?.emit("start_typing", {
      conversationId: currentConversation,
      receiverId,
    });
  },

  stopTyping: (receiverId) => {
    const socket = getSocket();

    const { currentConversation } = get();

    socket?.emit("stop_typing", {
      conversationId: currentConversation,
      receiverId,
    });
  },

  // ================= HELPERS =================
  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();

    if (!currentConversation) return false;

    return typingUsers.get(currentConversation)?.has(userId) || false;
  },

  isUserOnline: (userId) => {
    return get().onlineUsers.get(userId)?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    return get().onlineUsers.get(userId)?.lastSeen || null;
  },

  // ================= CLEANUP =================
  cleanup: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
