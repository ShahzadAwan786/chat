import React, { useEffect, useState } from "react";
import useLayoutStore from "../store/layout-store";
import useThemeStore from "../store/use-theme-store";
import SideBar from "./side-bar";
import ChatWindow from "../pages/chat-section/chat-window";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router";

export default function Layout({
  children,
  isThemeDialogOpen,
  toggleThemeDialog,
  isStatusPreviewOpen,
  statusPreviewContent,
}) {
  const location = useLocation();
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact,
  );
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 700);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div className="min-h-screen bg-bg text-text flex relative">
      {!isMobile && <SideBar />}
      <div
        className={`flex-1 flex overflow-hidden ${isMobile ? "flex-col" : ""}`}
      >
        <AnimatePresence initial={false}>
          {(selectedContact || !isMobile) && (
            <motion.div
              key="chatlist"
              initial={{ x: isMobile ? "-100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween" }}
              className={`w-full md:w-2/5 h-full ${isMobile ? "pb:16" : ""}`}
            >
              {children}
            </motion.div>
          )}

          {(selectedContact || !isMobile) && (
            <motion.div
              key="chatWindow"
              initial={{ x: isMobile ? "-100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween" }}
              className={`w-full h-full`}
            >
              <ChatWindow
                setSelectedContact={setSelectedContact}
                selectedContact={selectedContact}
                isMobile={isMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {isMobile && <SideBar />}

      {isThemeDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-dialog-bg text-text p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-2xl font-semibold mb-6">Choose Theme</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="light"
                  checked={theme === "light"}
                  onChange={() => setTheme("light")}
                  className="from-radio text-blue-600"
                />
                <span>Light</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="dark"
                  checked={theme === "dark"}
                  onChange={() => setTheme("dark")}
                  className="from-radio text-blue-600"
                />
                <span>Dark</span>
              </label>
            </div>
            <button
              onClick={toggleThemeDialog}
              className="bg-blue-500 text-white mt-6 py-2 rounded hover:bg-blue-600 transition duration-300 p-4 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isStatusPreviewOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {statusPreviewContent}
        </div>
      )}
    </div>
  );
}
