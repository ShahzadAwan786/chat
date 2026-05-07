import React, { useState, useRef, useEffect, useOptimistic } from "react";
import useUserStore from "../../store/use-user-store";
import { isToday, isYesterday, format } from "date-fns";
import EmojiPicker from "emoji-picker-react";

import {
  FaArrowLeft,
  FaEllipsisV,
  FaFile,
  FaImage,
  FaLock,
  FaPaperclip,
  FaSmile,
  FaTimes,
  FaVideo,
  FaWhatsapp,
} from "react-icons/fa";

import MessageBubble from "./message-bubble";
import { useChatStore } from "../../store/chat-store";
import { IoSend } from "react-icons/io5";

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};

export default function ChatWindow({ selectedContact, setSelectedContact }) {
  const [message, setMessage] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { user } = useUserStore();

  const {
    messages,
    sendMessage,
    deleteMessage,
    addReaction,
    fetchMessages,
    fetchConversation,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    isUserOnline,
    getUserLastSeen,
    cleanup,
  } = useChatStore();

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  // ================= FETCH =================
  useEffect(() => {
    fetchConversation();
  }, []);

  useEffect(() => {
    if (selectedContact?._id && conversations?.length > 0) {
      const conversation = conversations.find((conv) =>
        conv.participants.some((p) => p._id === selectedContact._id),
      );

      if (conversation?._id) {
        fetchMessages(conversation._id);
      }
    }
  }, [selectedContact, conversations]);

  // ================= SCROLL =================
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ================= TYPING =================
  useEffect(() => {
    if (message.trim() && selectedContact) {
      startTyping(selectedContact._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 2000);
    }

    return () => clearTimeout(typingTimeoutRef.current);
  }, [message, selectedContact]);

  // ================= CLEANUP =================
  useEffect(() => {
    return () => cleanup();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = null;

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      console.log(preview);
      setFilePreview(preview);
    } else {
      setFilePreview(null);
    }
    setShowFileMenu(false);
  };

  const normalizedMessages = Array.isArray(messages)
    ? messages
    : messages?.data || [];

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    normalizedMessages,
    (state, newMessage) => [...state, newMessage],
  );

  // ================= SEND =================
  const handleSendMessage = async () => {
    if (!selectedContact) return;
    if (!message.trim() && !selectedFile) return;

    try {
      const currentMessage = message;
      const currentPreview = filePreview;
      const currentFile = selectedFile;

      const optimisticMsg = {
        _id: `temp-${Date.now()}`,
        sender: user,
        receiver: selectedContact,
        content: currentMessage.trim(),
        media: currentPreview || null,
        createdAt: new Date().toISOString(),
        messageStatus: "sending",
      };

      addOptimisticMessage(optimisticMsg);

      setMessage("");

      const formData = new FormData();
      formData.append("senderId", user?._id);
      formData.append("receiverId", selectedContact?._id);
      formData.append("messageStatus", online ? "delivered" : "send");

      if (currentMessage.trim()) {
        formData.append("content", currentMessage.trim());
      }

      if (currentFile) {
        formData.append("media", currentFile, currentFile.name);
      }

      await sendMessage(formData);

      // FIX: cleanup AFTER send (not before)
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error) {
      console.error("Send failed", error);
    }
  };

  if (!selectedContact) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-form-bg">
        <div className="text-center max-w-md">
          <div className="bg-primary w-24 h-24 rounded-full mx-auto my-10 relative">
            <FaWhatsapp className="absolute inset-0 m-auto w-12 h-12 text-white" />
          </div>

          <h2 className="text-2xl font-semibold mb-4 text-text">
            Select a conversation
          </h2>

          <p className="text-muted mb-2">Choose a contact to start chatting</p>

          <p className="text-muted flex items-center justify-center gap-2">
            <FaLock />
            End-to-end encrypted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="bg-form-bg p-2 flex items-center">
        <button onClick={() => setSelectedContact(null)}>
          <FaArrowLeft className="mx-2 cursor-pointer" />
        </button>

        <img
          src={selectedContact.profilePicture}
          alt={selectedContact.userName}
          className="w-10 h-10 rounded-full ml-3 object-cover"
        />

        <div className="ml-3 flex-1">
          <h3 className="font-semibold text-start">
            {selectedContact.userName}
          </h3>

          {isTyping ? (
            <span>Typing...</span>
          ) : (
            <span className="text-sm text-muted">
              {online
                ? "Online"
                : lastSeen
                  ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
                  : "Offline"}
            </span>
          )}
        </div>

        <button className="cursor-pointer">
          <FaVideo className="mx-4 h-5 w-5" />
        </button>

        <button className="cursor-pointer">
          <FaEllipsisV className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-chat-bg">
        {optimisticMessages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            currentUser={user}
            onReact={addReaction}
            deleteMessage={deleteMessage}
          />
        ))}
        <div ref={messageEndRef} />
      </div>

      {/* PREVIEW */}
      {filePreview && (
        <div className="relative p-2">
          <img
            src={filePreview}
            alt="preview"
            className="w-30 object-cover rounded shadow-lg mx-auto"
          />

          <button
            className="absolute top-1 left-1 right-1 p-1  text-text rounded-full"
            onClick={() => {
              setFilePreview(null);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = null;
            }}
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* INPUT */}
      <div className="p-2 bg-layout-bg flex gap-2 items-center">
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <FaSmile className="w-6 h-6 text-muted ml-4" />
        </button>

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute left-1 bottom-16 z-50">
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                setMessage((prev) => prev + emojiObject.emoji);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}

        <div className="relative">
          <button onClick={() => setShowFileMenu(!showFileMenu)}>
            <FaPaperclip className="text-muted w-6 h-6 mt-2" />
          </button>

          {showFileMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-progress-bg rounded-lg shadow-lg">
              <input
                type="file"
                onChange={handleFileChange}
                ref={fileInputRef}
                accept="image/*,video/*"
                className="hidden"
              />

              <button
                onClick={() => {
                  fileInputRef.current.click();
                }}
                className="flex items-center px-4 py-2 w-full bg-dialog-bg cursor-pointer"
              >
                <FaImage className="mr-2" />
                Image/video
              </button>

              <button
                onClick={() => {
                  (fileInputRef.current.click(),
                    setShowFileMenu(!showFileMenu));
                }}
                className="flex items-center px-4 py-2 w-full bg-dialog-bg cursor-pointer"
              >
                <FaFile className="mr-2" />
                Document
              </button>
            </div>
          )}
        </div>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 px-4 py-2 bg-input-bg border rounded-full"
          placeholder="Type a message..."
        />

        <button onClick={handleSendMessage} className="text-primary">
          <IoSend className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
