import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:8000";

export function createChatSocket(token) {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
}
