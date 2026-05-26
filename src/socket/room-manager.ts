import { AuthenticatedSocket } from '../middleware/socket-auth.middleware';
import { logger } from '../logger/winston.logger';

export class RoomManager {
  public joinRoom(socket: AuthenticatedSocket, roomName: string): void {
    socket.join(roomName);
    logger.info(`Socket ${socket.id} (User: ${socket.user?.userId}) joined room: ${roomName}`);
    socket.to(roomName).emit('room:member_joined', { socketId: socket.id, userId: socket.user?.userId });
  }

  public leaveRoom(socket: AuthenticatedSocket, roomName: string): void {
    socket.leave(roomName);
    logger.info(`Socket ${socket.id} (User: ${socket.user?.userId}) left room: ${roomName}`);
    socket.to(roomName).emit('room:member_left', { socketId: socket.id, userId: socket.user?.userId });
  }
}
