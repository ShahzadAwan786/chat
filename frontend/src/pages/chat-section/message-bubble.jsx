import React, { useRef, useState } from "react";
import {
  FaTrash,
  FaCheck,
  FaCheckDouble,
  FaSmile,
  FaPlus,
  FaRegCopy,
} from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { HiDotsVertical } from "react-icons/hi";
import useOutSideClick from "../../hooks/useOutSideClick";
import EmojiPicker from "emoji-picker-react";
import useUserStore from "../../store/use-user-store";
import useThemeStore from "../../store/use-theme-store";
export default function MessageBubble({
  message,
  currentUser,
  onReact,
  deleteMessage,
}) {
  const { theme } = useThemeStore();

  const { user } = useUserStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const messageRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionsMenuRef = useRef(null);
  const optionRef = useRef(null);

  const quickReactions = ["👍", "😮", "❤️", "😂", "😢"];

  const isUserMessage = message.sender?._id === currentUser?._id;
  const bubbleClass = isUserMessage ? "chat-end" : "chat-start";
  const bubbleContentClass = isUserMessage
    ? `chat-bubble max-w-[70%] min-w-[100px] bg-msg-bg text-text`
    : `chat-bubble max-w-[70%] min-w-[100px] bg-dialog-bg text-text`;

  const handleReaction = (emoji) => {
    onReact(message?._id, emoji, user?._id);
    setShowReactions(false);
    setShowEmojiPicker(false);
  };

  useOutSideClick(emojiPickerRef, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
  });

  useOutSideClick(reactionsMenuRef, () => {
    if (showReactions) setShowReactions(false);
  });

  useOutSideClick(optionRef, () => {
    if (showOptions) setShowOptions(false);
  });

  if (message.length === 0) return;

  return (
    <div
      className={`chat ${bubbleClass} ${message.reactions?.length > 0 ? "mb-4" : ""}`}
    >
      <div className={`${bubbleContentClass} relative group`} ref={messageRef}>
        <div className="flex gap-2">
          {message.contentType === "text" && (
            <p className="wrap-break-word">{message.content}</p>
          )}
          {message.media && message.contentType === "image" && (
            <div>
              <img
                src={message.media}
                alt="media"
                className="rounded mt-2 max-h-60 object-cover"
              />
              <p className="wrap-break-word">{message.content}</p>
            </div>
          )}
        </div>
        <div className="flex self-end justify-end items-center gap-2 mt-1 ml-2 text-xs opacity-70">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isUserMessage && (
            <>
              {message.messageStatus === "send" && <FaCheck size={12} />}
              {message.messageStatus === "delivered" && (
                <FaCheckDouble size={12} />
              )}
              {message.messageStatus === "read" && (
                <FaCheckDouble size={12} className="text-blue-600" />
              )}
            </>
          )}{" "}
        </div>
        <div className="absolute top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            className="p-1 rounded-full text-text cursor-pointer"
            onClick={() => setShowOptions((prev) => !prev)}
          >
            <HiDotsVertical />
          </button>
        </div>
        <div
          className={`absolute ${isUserMessage ? "-left-10" : "-right-10"} top-1/2 transform -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity  ${theme === "dark" ? "" : "bg-gray-200"} p-2 rounded-full`}
        >
          <button onClick={() => setShowReactions(!showReactions)}>
            <FaSmile className={`${theme === "dark" ? "" : "text-gray-800"}`} />
          </button>
        </div>
        {showReactions && (
          <div
            ref={reactionsMenuRef}
            className={`absolute -top-9 ${isUserMessage ? "left-0" : "left-36"} transform -translate-x-1/2 flex items-center  rounded-full px-8 py-1 hover:bg-[#202c33]/90 shadow-lg  z-50`}
          >
            {quickReactions.map((emoji, i) => (
              <button
                key={i}
                className="hover:scale-175 transition-transform p-1"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
            <div className="w-0.5 h-5 bg-gray-600 mx-1">
              <button
                className="rounded-full ml-2 hover:bg-[#ffffff1a] p-1"
                onClick={() => setShowEmojiPicker(true)}
              >
                <FaPlus className="w-4 h-4 text-gray-400" />
              </button>{" "}
            </div>
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute -left-100 top-5  mb-6 z-50 "
              >
                <div className="relative">
                  <EmojiPicker
                    onEmojiClick={(emojiObject) => {
                      handleReaction(emojiObject.emoji);
                    }}
                  />
                  <button
                    className="absolute top-2 right-2 text-muted cursor-pointer"
                    onClick={() => setShowEmojiPicker(false)}
                  >
                    <RxCross2 />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {message.reactions?.length > 0 && (
          <div
            className={`absolute -bottom-5 ${isUserMessage ? "right-2" : "left-2"} bg-layout-bg p-1 py-0.5 rounded-full text-sm shadow-mb`}
          >
            {message.reactions.map((r, i) => (
              <span key={i}>{r.emoji}</span>
            ))}
          </div>
        )}

        {showOptions && (
          <div
            ref={optionRef}
            className="absolute top-8 right-1 z-50 w-36 rounded-xl shadow-lg py-2 text-sm bg-dialog-bg text-text"
          >
            <button
              onClick={() => {
                if (message.contentType === "text") {
                  navigator.clipboard.writeText(message.content);
                }
                setShowOptions(false);
              }}
              className="flex items-center w-full px-4 py-2 gap-3 rounded-lg cursor-pointer font-semibold"
            >
              <FaRegCopy size={14} />
              <span>Copy</span>
            </button>
            {isUserMessage && (
              <button
                onClick={() => {
                  deleteMessage(message?._id);
                  setShowOptions(false);
                }}
                className="flex items-center w-full px-4 py-2 gap-3 rounded-lg cursor-pointer font-semibold"
              >
                <FaTrash size={14} className="text-red-600" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
