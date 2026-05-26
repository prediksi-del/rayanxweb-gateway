import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as dotenv from 'dotenv';
import { adminHandler } from './handlers/admin';
import { deviceHandler } from './handlers/device';
import { authorizeConnection } from './auth';

// 1. Pastikan dotenv dimuat di paling atas
dotenv.config();

const app = express();
const server = createServer(app);

// 2. Tambahkan Health Check agar Railway tidak menganggap aplikasi mati
app.get('/', (req, res) => {
  res.status(200).send('Gateway is online');
});

// 3. Konfigurasi Socket yang lebih ketat
const io = new Server(server, {
  cors: { 
    origin: process.env.ALLOWED_ORIGIN || "https://rayanxweb-dashboard.vercel.app", 
    methods: ["GET", "POST"] 
  },
  transports: ["websocket"] // Wajib untuk performa real-time
});

io.use(authorizeConnection);

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id} | Type: ${socket.handshake.query.type}`);
  const isDevice = socket.handshake.query.type === 'device';
  if (isDevice) deviceHandler(io, socket);
  else adminHandler(io, socket);
});

// 4. Gunakan port dari environment variable
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Gateway server listening on port ${PORT}`);
});
