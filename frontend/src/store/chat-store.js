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

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("receiver_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("online_users_snapshot");
    socket.off("message_status_update");
    socket.off("reaction_update");
    socket.off("message_deleted");
    socket.off("message_read");

    socket.on("receiver_message", (message) => {
      get().receiveMessage(message);
    });

    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const updated = new Map(state.onlineUsers);
        updated.set(userId, { isOnline, lastSeen });
        return { onlineUsers: updated };
      });
    });

    socket.on("online_users_snapshot", (users) => {
      set((state) => {
        const updated = new Map(state.onlineUsers);
        users.forEach(({ userId, isOnline, lastSeen }) => {
          updated.set(userId, { isOnline, lastSeen });
        });
        return { onlineUsers: updated };
      });
    });

    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const updated = new Map(state.typingUsers);
        if (!updated.has(conversationId)) {
          updated.set(conversationId, new Set());
        }
        const typingSet = updated.get(conversationId);
        if (isTyping) typingSet.add(userId);
        else typingSet.delete(userId);
        return { typingUsers: updated };
      });
    });

    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id?.toString() === messageId?.toString()
            ? { ...msg, messageStatus }
            : msg,
        ),
      }));
    });

    socket.on("message_read", ({ _id, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id?.toString() === _id?.toString()
            ? { ...msg, messageStatus }
            : msg,
        ),
      }));
    });

    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id?.toString() !== messageId?.toString()
            ? msg
            : { ...msg, reactions: [...reactions] },
        ),
      }));
    });

    socket.on("message_deleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter(
          (msg) => msg._id?.toString() !== messageId?.toString(),
        ),
      }));
    });
  },

  fetchConversation: async () => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get("/chats/conversation");
      set({ conversations: data?.data || [], loading: false });
      return data?.data || [];
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || error.message,
      });
      return [];
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(
        `/chats/conversation/${conversationId}/messages`,
      );
      set({
        messages: data?.data || [],
        currentConversation: conversationId.toString(),
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

  sendMessage: async (formData) => {
    try {
      const tempId = `temp-${Date.now()}`;

      set((state) => ({ messages: [...state.messages] }));

      const { data } = await axiosInstance.post(
        "/chats/send-message",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const savedMessage = data?.data;

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

  receiveMessage: (message) => {
    if (!message) return;

    set((state) => {
      const isCurrentConversation =
        message.conversationId?.toString() ===
        state.currentConversation?.toString();

      const updatedConversations = state.conversations.map((conv) => {
        if (conv._id?.toString() !== message.conversationId?.toString())
          return conv;
        return {
          ...conv,
          lastMessage: message,
          unreadCount: isCurrentConversation ? 0 : (conv.unreadCount || 0) + 1,
        };
      });

      const exists = state.messages.some(
        (m) => m._id?.toString() === message._id?.toString(),
      );

      return {
        conversations: updatedConversations,
        messages:
          isCurrentConversation && !exists
            ? [...state.messages, message]
            : state.messages,
      };
    });
  },

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
          unreadIds.some((id) => id?.toString() === msg._id?.toString())
            ? { ...msg, messageStatus: "read" }
            : msg,
        ),
      }));
    } catch (error) {
      console.log(error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter(
          (msg) => msg._id?.toString() !== messageId?.toString(),
        ),
      }));
    } catch (error) {
      console.log(error);
    }
  },

  addReaction: (messageId, emoji) => {
    const socket = getSocket();
    socket?.emit("add_reactions", { messageId, emoji });
  },

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

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (!currentConversation) return false;
    const users = typingUsers.get(currentConversation);
    if (!users) return false;
    return users.has(userId);
  },

  isUserOnline: (userId) => {
    return get().onlineUsers.get(userId)?.isOnline === true;
  },

  getUserLastSeen: (userId) => {
    return get().onlineUsers.get(userId)?.lastSeen || null;
  },

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
