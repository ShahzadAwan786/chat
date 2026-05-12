import { BrowserRouter, Routes, Route } from "react-router-dom";
import LogIn from "./pages/auth/login";
import { ToastContainer } from "react-toastify";
import ProtectedRoute, { PublicRoute } from "../protected";
import Home from "./components/home";
import UserDetail from "./components/user-detail";
import Setting from "./pages/setting/setting";
import Status from "./pages/status/status";
import useUserStore from "./store/use-user-store";
import { useChatStore } from "./store/chat-store";
import { useEffect } from "react";
import { disconnectSocket } from "./services/chat-services";
export default function App() {
  const { user } = useUserStore();
  const { initSocketListeners, cleanup } = useChatStore();
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  useEffect(() => {
    if (user?._id) {
      const socket = initSocketListeners();
      setCurrentUser(user);

      if (socket) {
        initSocketListeners();
      }
    }

    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [user]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LogIn />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/user-profile" element={<UserDetail />} />
            <Route path="/setting" element={<Setting />} />
            <Route path="/status" element={<Status />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
