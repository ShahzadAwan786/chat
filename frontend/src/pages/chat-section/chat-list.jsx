import React, { useState } from "react";
import useThemeStore from "../../store/use-theme-store";
import useUserStore from "../../store/use-user-store";
import useLayoutStore from "../../store/layout-store";
import { FaPlus, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import formatTimestamp from "../../utils/data";

export default function ChatList({ contacts }) {
  const selectedContant = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact,
  );
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const [searchTerms, setSearchTerms] = useState("");

  const filteredContact = contacts?.filter((contact) =>
    contact?.userName?.toLowerCase().includes(searchTerms.toLowerCase()),
  );

  return (
    <div className="w-full h-screen border-r bg-chat-list-bg border-form-border p-2">
      <div className="p-4 flex justify-between text-text">
        <h2 className="text-xl font-semibold">ChatList</h2>
        <button className="bg-primary hover:bg-primary-hover text-white transition-colors p-2 rounded-full cursor-pointer">
          <FaPlus />
        </button>
      </div>
      <div className="relative p-2 mb-2">
        <FaSearch
          className={`absolute left-6 top-1/2 transform -translate-y-1/2 text-text`}
        />
        <input
          type="text"
          placeholder="Search or start new chat"
          className={
            "w-full pl-10 pr-4 py-2 border rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary bg-form-bg/70 border-form-border"
          }
          value={searchTerms}
          onChange={(e) => setSearchTerms(e.target.value)}
        />
      </div>
      <div className="overflow-y-auto  space-y-2">
        {filteredContact.map((contact) => {
          const isActive = selectedContant?._id === contact?._id;

          return (
            <motion.div
              key={contact?._id}
              onClick={() => setSelectedContact(contact)}
              className={`p-3 flex items-center cursor-pointer transition-colors
        ${isActive ? "bg-progress-bg" : ""}
        hover:bg-contact-hover rounded-xl
       
      `}
            >
              <img
                src={contact?.profilePicture}
                alt={contact?.userName}
                className="w-12 h-12 rounded-full object-cover"
              />

              <div className="ml-3 flex-1">
                <div className="flex justify-between items-baseline">
                  <h2 className="font-semibold text-text">
                    {contact?.userName}
                  </h2>
                  {contact?.conversation && (
                    <span className="text-xs text-muted">
                      {formatTimestamp(
                        contact?.conversation?.lastMessage?.createdAt,
                      )}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm text-muted truncate">
                    {contact?.conversation?.lastMessage?.content}
                  </p>
                  {contact?.conversation &&
                    contact?.conversation?.unreadCount > 0 &&
                    contact?.conversation?.lastMessage?.receiver?._id ===
                      user?._id && (
                      <p className="text-xs font-semibold flex items-center justify-center w-5 h-5 mt-1  text-white rounded-full bg-primary">
                        {contact?.conversation?.unreadCount}
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
