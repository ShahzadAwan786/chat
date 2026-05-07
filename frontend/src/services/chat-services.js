import { io } from "socket.io-client";
import useUserStore from "../store/use-user-store";

let socket = null;

const token = () => localStorage.getItem("auth-token");

export const initializeSocket = () => {
  if (socket) return socket;

  const user = useUserStore.getState().user;

  const BACKEND_URL = "http://localhost:8000";

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ["polling", "websocket"],
    // withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log(`socket connected ${socket.id}`);
    socket.emit("user_connected", user?._id);
  });
  socket.on("connect_error", (error) => {
    console.log("socket connected error", error);
  });
  socket.on("disconnect", (reason) => {
    console.log("socket disconnected", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return socket;
};
