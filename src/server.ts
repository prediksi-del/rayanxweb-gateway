import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { ClientDevice, RelayPayload } from './types';

const app = express();
app.use(cors({ origin: '*' }));

// Endpoint monitoring untuk menjaga server tetap aktif (Ping/Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: Date.now() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 30000,
  pingInterval: 10000,
  cors: { 
    origin: '*', 
    methods: ['GET', 'POST'] 
  }
});

const dashboardSessions = new Set<string>();
const activeClients = new Map<string, ClientDevice>();

io.on('connection', (socket: Socket) => {
  let sessionType: 'DASHBOARD' | 'CLIENT' | null = null;
  let clientIdentifier: string | null = null;

  console.log(`[NET-LOG] Tunnel Opened: ${socket.id}`);

  // 1. Handshake Akses untuk Dashboard Web Next.js
  socket.on('register_dashboard', (data: { token: string }) => {
    if (data.token !== 'ADMIN_SECURE_TOKEN_XYZ') {
      socket.emit('auth_error', { message: 'Insecure or invalid token presentation.' });
      return socket.disconnect(true);
    }
    sessionType = 'DASHBOARD';
    dashboardSessions.add(socket.id);
    socket.join('dashboard_pool');

    // Kirim snapshot instan seluruh perangkat online ke dashboard yang baru masuk
    const snapshots = Array.from(activeClients.entries()).map(([id, dev]) => ({
      deviceId: id,
      model: dev.model,
      connectedAt: dev.connectedAt
    }));
    socket.emit('device_snapshot', snapshots);
    console.log(`[NET-LOG] Dashboard authenticated successfully: ${socket.id}`);
  });

  // 2. Handshake Akses untuk Android Client App (Sistem Autentikasi PIN)
  socket.on('register_client', (data: { deviceId: string; pin: string; model: string }) => {
    if (data.pin !== '814069') {
      socket.emit('auth_error', { message: 'Authentication PIN mismatch.' });
      return socket.disconnect(true);
    }
    sessionType = 'CLIENT';
    clientIdentifier = data.deviceId;

    activeClients.set(data.deviceId, {
      socketId: socket.id,
      pin: data.pin,
      model: data.model || 'Generic Android Target',
      connectedAt: Date.now(),
      status: 'online'
    });

    socket.join('client_pool');
    
    // Kabarkan ke dashboard bahwa device telah online
    io.to('dashboard_pool').emit('device_online', {
      deviceId: data.deviceId,
      model: data.model,
      connectedAt: Date.now()
    });
    console.log(`[NET-LOG] Target Device linked successfully: ${data.deviceId} (${data.model})`);
  });

  // 3. Sistem Pengukuran Latensi (Ping Checker)
  socket.on('ping_check', (callback: () => void) => {
    if (typeof callback === 'function') callback();
  });

  // 4. Hub Penyalur (Relay) Instan untuk 17 Fitur Kontrol Utama
  socket.on('relay_instruction', (payload: RelayPayload) => {
    // Pastikan yang mengirim perintah benar-benar sesi dashboard valid
    if (!dashboardSessions.has(socket.id)) return;

    const target = activeClients.get(payload.targetId);
    if (target) {
      // Teruskan instruksi secara real-time langsung ke Socket ID Android Client tujuan
      io.to(target.socketId).emit('execute_payload', {
        action: payload.action,
        params: payload.params || {}
      });
      console.log(`[NET-LOG] Relay command [${payload.action.toUpperCase()}] piped to Device: ${payload.targetId}`);
    }
  });

  // 5. Otomatisasi Pembersihan Sesi Memori Saat Terputus (Anti-Leak)
  socket.on('disconnect', (reason) => {
    if (sessionType === 'DASHBOARD') {
      dashboardSessions.delete(socket.id);
      console.log(`[NET-LOG] Dashboard disconnected: ${socket.id} (${reason})`);
    } else if (sessionType === 'CLIENT' && clientIdentifier) {
      activeClients.delete(clientIdentifier);
      // Beritahu dashboard secara instan bahwa device offline tanpa perlu refresh halaman
      io.to('dashboard_pool').emit('device_offline', { deviceId: clientIdentifier });
      console.log(`[NET-LOG] Target Device disconnected: ${clientIdentifier} (${reason})`);
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(` RAYANXWEB NETWORK GATEWAY (PROYEK 1) RUNNING ON PORT ${PORT}`);
  console.log(`=============================================================`);
});
