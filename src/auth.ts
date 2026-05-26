import { Socket } from 'socket.io';

export const authorizeConnection = (socket: Socket, next: any) => {
  const { token } = socket.handshake.auth; // token = PIN unik perangkat
  if (!token) return next(new Error("Akses Ditolak: PIN diperlukan"));
  
  // Set PIN sebagai room ID
  socket.data.pin = token;
  next();
};
