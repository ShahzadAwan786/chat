import { io } from "socket.io-client";
import useUserStore from "../store/use-user-store";

let socket = null;

const getToken = () => localStorage.getItem("auth-token");

export const initializeSocket = () => {
  if (socket) return socket;

  const user = useUserStore.getState().user;

  const BACKEND_URL = "http://localhost:8000";

  socket = io(BACKEND_URL, {
    auth: {
      token: getToken(),
    },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("socket connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.log("socket connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
