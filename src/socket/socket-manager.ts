import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '../services/redis.service';
import { socketAuthMiddleware, AuthenticatedSocket } from '../middleware/socket-auth.middleware';
import { PresenceManager } from './presence-manager';
import { RoomManager } from './room-manager';
import { logger } from '../logger/winston.logger';

export class SocketServerManager {
  private io: Server;
  private presenceManager = new PresenceManager();
  private roomManager = new RoomManager();

  constructor(server: any) {
    const { pubClient, subClient } = RedisService.getClients();
    
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Skalabilitas Horizontal dengan Redis Adapter Cluster
    this.io.adapter(createAdapter(pubClient, subClient));
    this.initializeNamespaces();
  }

  private initializeNamespaces() {
    const rootNamespace = this.io.of('/');
    rootNamespace.use(socketAuthMiddleware);

    rootNamespace.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.user!.userId;
      const socketId = socket.id;

      logger.info(`Connected node tunnel established: ${socketId} for active subject`);
      this.presenceManager.setOnline(userId, socketId);

      // Event-driven lifecycle hooks
      socket.broadcast.emit('user:connected', { userId });

      // Handle custom event registrations
      this.registerEventHandlers(socket);

      // Heartbeat Monitoring / Ping-Pong
      socket.on('heartbeat:ping', () => {
        socket.emit('heartbeat:pong', { serverTime: Date.now() });
      });

      // Disconnection lifecycle
      socket.on('disconnect', async () => {
        logger.info(`Socket disconnected: ${socketId}`);
        const isCompletelyOffline = await this.presenceManager.setOffline(userId, socketId);
        if (isCompletelyOffline) {
          rootNamespace.emit('user:disconnected', { userId });
          rootNamespace.emit('device:offline', { deviceId: userId });
        }
      });
    });
  }

  private registerEventHandlers(socket: AuthenticatedSocket) {
    // Room management event mappings
    socket.on('room:join', (data: { roomName: string }) => {
      this.roomManager.joinRoom(socket, data.roomName);
    });

    socket.on('room:leave', (data: { roomName: string }) => {
      this.roomManager.leaveRoom(socket, data.roomName);
    });

    // Real-time device stream proxy ingestion
    socket.on('device:update', (payload: any) => {
      socket.to(`device:${payload.deviceId}`).emit('device:update', payload);
      this.io.to('admin_room').emit('logs:new', { type: 'DEVICE', payload });
    });

    // Analytics monitoring feed ingestion
    socket.on('analytics:update', (payload: any) => {
      this.io.to('analytics_dashboard').emit('analytics:update', payload);
    });

    // Notification broadcast handler
    socket.on('notification:new', (payload: any) => {
      this.io.emit('notification:new', payload);
    });

    // Critical security alerting dispatch system
    socket.on('security:alert', (payload: any) => {
      logger.warn(`[SECURITY CRITICAL INGESTION]:`, payload);
      this.io.to('admin_room').emit('security:alert', payload);
    });

    // Admin orchestration structural broadcasts
    socket.on('admin:broadcast', (payload: any) => {
      if (socket.user?.role === 'SUPERADMIN' || socket.user?.role === 'ADMIN') {
        this.io.emit('admin:broadcast', payload);
        this.io.emit('dashboard:refresh');
      } else {
        socket.emit('error:unauthorized', { message: 'Banned operation injection dropped' });
      }
    });
  }
        }
