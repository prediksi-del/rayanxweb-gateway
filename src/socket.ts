import { Server } from "socket.io";
import { Server as HttpServer } from "http";

export const initSocket = (httpServer: HttpServer) => {
  return new Server(httpServer, {
    cors: {
      origin: "https://rayanxweb-dashboard.vercel.app",
      methods: ["GET", "POST"]
    },
    transports: ["websocket"] // Fokus pada WebSocket untuk latensi rendah
  });
};
