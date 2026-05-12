import React, { useState, useRef, useEffect } from "react";
import useUserStore from "../../store/use-user-store";
import { format } from "date-fns";
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

  // Track which conversation we already fetched messages for so that
  // adding conversations to the dependency array below doesn't trigger
  // a redundant re-fetch every time the conversations list updates.
  const fetchedConvIdRef = useRef(null);

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
    initSocketListeners,
  } = useChatStore();

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);
  const lastSeenText = lastSeen
    ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
    : "Offline";

  // ================= FETCH =================
  useEffect(() => {
    fetchConversation();
    initSocketListeners();
  }, []);

  // FIX: `conversations` is now in the dependency array.
  //
  // Why this was broken before:
  //   - `fetchConversation` is async; it often resolves AFTER this effect
  //     first runs (when selectedContact changes).
  //   - With `[selectedContact]` only, the effect ran while `conversations`
  //     was still [], found no match, and never called `fetchMessages`.
  //   - Adding `conversations` means the effect re-runs once the list loads.
  //
  // The `fetchedConvIdRef` guard prevents re-fetching the same conversation
  // when unrelated conversation list updates happen (e.g. unread count bumps).
  useEffect(() => {
    if (!selectedContact || !conversations.length) return;

    const conversation = conversations.find((conv) =>
      conv.participants.some((p) => p._id === selectedContact._id),
    );

    if (!conversation?._id) return;

    // Only fetch if this is a different conversation than what we last loaded
    const convId = conversation._id.toString();
    if (convId === fetchedConvIdRef.current) return;

    fetchedConvIdRef.current = convId;
    fetchMessages(convId);
  }, [selectedContact, conversations]);

  // Reset the ref whenever the user picks a different contact so we always
  // re-fetch when switching conversations.
  useEffect(() => {
    fetchedConvIdRef.current = null;
  }, [selectedContact]);

  // ================= SCROLL =================
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedContact) return;

    if (message.trim()) {
      startTyping(selectedContact._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 2000);
    } else {
      stopTyping(selectedContact._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact]);

  // ================= CLEANUP =================
  useEffect(() => {
    return () => cleanup();
  }, []);

  // ================= FILE =================
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = null;
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }

    setShowFileMenu(false);
  };

  // ================= SEND =================
  const handleSendMessage = async () => {
    if (!selectedContact) return;
    if (!message.trim() && !selectedFile) return;

    try {
      const currentMessage = message;
      const currentFile = selectedFile;

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

      setSelectedFile(null);
      setFilePreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
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
      {/* HEADER */}
      <div className="bg-form-bg p-2 flex items-center">
        <button
          onClick={() => setSelectedContact(null)}
          className="cursor-pointer"
        >
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
              {online ? "Online" : lastSeenText}
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

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 bg-chat-bg">
        {messages.map((msg) => (
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

      {/* FILE PREVIEW */}
      {filePreview && (
        <div className="relative p-2">
          <img
            src={filePreview}
            alt="preview"
            className="w-30 object-cover rounded shadow-lg mx-auto"
          />

          <button
            className="absolute top-1 left-1 right-1 p-1 text-text rounded-full cursor-pointer"
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
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="cursor-pointer"
        >
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
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="cursor-pointer"
          >
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
                onClick={() => fileInputRef.current.click()}
                className="flex items-center px-4 py-2 w-full bg-dialog-bg cursor-pointer"
              >
                <FaImage className="mr-2" />
                Image/video
              </button>

              <button
                onClick={() => {
                  fileInputRef.current.click();
                  setShowFileMenu(false);
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

        <button
          onClick={handleSendMessage}
          className="text-primary cursor-pointer"
        >
          <IoSend className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
