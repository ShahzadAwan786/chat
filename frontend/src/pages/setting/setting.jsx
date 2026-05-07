import useUserStore from "../../store/use-user-store";
import useThemeStore from "../../store/use-theme-store";
import { logoutUser } from "../../services/user-api";
import Layout from "../../components/layout";
import { useState } from "react";
import {
  FaComment,
  FaMoon,
  FaQuestion,
  FaSearch,
  FaSignInAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Setting() {
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const { theme } = useThemeStore();
  const { user, clearUser } = useUserStore();

  const toggleThemeDialog = () => {
    setIsThemeDialogOpen(!isThemeDialogOpen);
  };
  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      toast.success("User logged out successfully");
    } catch (error) {
      console.error("Failed to logged out", error);
    }
  };

  const linkArray = [
    { icon: <FaUser />, href: "/profile", tag: "Account" },
    { icon: <FaComment />, href: "/", tag: "Chat" },
    { icon: <FaQuestion />, href: "/help", tag: "Help" },
  ];

  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={toggleThemeDialog}
    >
      <div className="w-full  h-screen text-text border-r bg-chat-list-bg border-form-border p-2">
        <div className="p-4">
          <h1 className="text-xl font-semibold ">Settings</h1>
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
            value={""}
            onChange={(e) => e.target.value}
          />
        </div>
        <div className="flex items-center gap-6  hover:bg-contact-hover rounded-xl p-2 w-full">
          <img
            src={user?.profilePicture}
            alt="profile"
            className="w-14 h-14 rounded-full object-cover"
          />
          <h2 className="text-lg font-semibold text-text"> {user?.userName}</h2>
        </div>
        <div className="space-y-1 mt-5">
          {linkArray.map((item) => {
            return (
              <Link
                to={item.href}
                key={item.tag}
                className="flex items-center gap-8 p-4  text-lg text-text font-medium   hover:bg-contact-hover rounded-xl "
              >
                {item.icon}
                {item.tag}
              </Link>
            );
          })}
        </div>
        <button
          className="w-full flex items-center gap-8 p-4 text-text hover:bg-contact-hover rounded-xl"
          onClick={toggleThemeDialog}
        >
          {theme === "dark" ? (
            <FaMoon className="w-5 h-5" />
          ) : (
            <FaSun className="w-5 h-5" />
          )}
          <div className="flex items-center gap-2 font-medium ">
            Theme
            {<span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>}
          </div>
        </button>
        <button
          className="w-full flex items-center gap-8 p-4  text-base font-medium text-red-500 hover:bg-contact-hover rounded-xl cursor-pointer"
          onClick={handleLogout}
        >
          <FaSignInAlt className="w-5 h-5" />
          Logout
        </button>
      </div>
    </Layout>
  );
}
