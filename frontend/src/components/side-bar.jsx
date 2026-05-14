import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useThemeStore from "../store/use-theme-store";
import useUserStore from "../store/use-user-store";
import useLayoutStore from "../store/layout-store";
import { FaCog, FaUser, FaWhatsapp } from "react-icons/fa";
import { MdRadioButtonChecked } from "react-icons/md";

import { motion } from "framer-motion";

export default function SideBar() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const { theme, setTheme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 700);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab("chats");
    } else if (location.pathname === "/status") {
      setActiveTab("status");
    } else if (location.pathname === "/profile") {
      setActiveTab("profile");
    } else if (location.pathname === "/setting") {
      setActiveTab("setting");
    }
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) {
    return null;
  }

  const SideBarContent = () => (
    <>
      <Link
        to="/"
        className={`${isMobile ? "" : "mb-8"} ${activeTab === "chats" && "bg-gray-300 text-gray-800 shadow-sm p-2 rounded-full"} focus-outline-none`}
      >
        <FaWhatsapp className={`h-6 w-6 `} />
      </Link>
      <Link
        to="/status"
        className={`${isMobile ? "" : "mb-8"} ${activeTab === "status" && "bg-gray-300 text-gray-800 shadow-sm p-2 rounded-full"} focus-outline-none`}
      >
        <MdRadioButtonChecked className={`h-6 w-6 `} />
      </Link>
      {!isMobile && <div className="grow" />}
      <Link
        to="/profile"
        className={`${isMobile ? "" : "mb-8"} ${activeTab === "profile" && "bg-gray-300 text-gray-800 shadow-sm p-2 rounded-full"} focus-outline-none`}
      >
        {user.profilePicture ? (
          <img
            src={user?.profilePicture}
            alt="user"
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <FaUser className={`h-6 w-6 `} />
        )}
      </Link>

      <Link
        to="/setting "
        className={`${isMobile ? "" : "mb-8"} ${activeTab === "setting" && "bg-gray-300 text-gray-800 shadow-sm p-2 rounded-full"} focus-outline-none`}
      >
        <FaCog className={`h-6 w-6 `} />
      </Link>
    </>
  );
  return (
    <motion.div
      inital={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transtion={{ duration: 0.3 }}
      className={`${isMobile ? "fixed bottom-0 left-0 right-0 h-16" : "w-16 h-screen border-r-2"} bg-form-bg border-text/10 flex items-center py-4 shadow-lg ${isMobile ? "flex-row justify-around" : " flex-col justify-between"}`}
    >
      <SideBarContent />
    </motion.div>
  );
}
