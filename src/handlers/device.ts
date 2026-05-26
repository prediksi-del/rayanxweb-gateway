import { Socket, Server } from 'socket.io';

export const deviceHandler = (io: Server, socket: Socket) => {
  const pin = socket.data.pin;
  socket.join(pin);

  // Menerima data dari Android dan meneruskannya ke Dashboard
  socket.on('device_response', (payload) => {
    console.log(`[${pin}] Data diterima dari perangkat`);
    io.to(pin).emit('admin_receive', payload);
  });

  socket.on('disconnect', () => {
    io.to(pin).emit('device_status', { status: 'offline' });
  });
};
