import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { adminHandler } from './handlers/admin';
import { deviceHandler } from './handlers/device';
import { authorizeConnection } from './auth';

const app = express();
const server = createServer(app);

// CORS diatur agar hanya menerima request dari dashboard Vercel Anda
const io = new Server(server, {
  cors: { origin: "https://rayanxweb-dashboard.vercel.app", methods: ["GET", "POST"] }
});

// Middleware Otorisasi
io.use(authorizeConnection);

io.on('connection', (socket) => {
  const isDevice = socket.handshake.query.type === 'device';
  if (isDevice) deviceHandler(io, socket);
  else adminHandler(io, socket);
});

server.listen(process.env.PORT || 3000, () => console.log('Gateway Live'));
