import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { logger } from '../logger/winston.logger';

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

    if (!token) {
      logger.warn(`Rejected unauthorized connection attempt. Socket ID: ${socket.id}`);
      return next(new Error('Authentication error: Missing token'));
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(cleanToken, ENV.JWT_SECRET) as AuthenticatedSocket['user'];

    socket.user = decoded;
    logger.info(`Socket authenticated. User ID: ${decoded?.userId}, Role: ${decoded?.role}`);
    next();
  } catch (error) {
    logger.error('Socket authentication failed:', error);
    next(new Error('Authentication error: Invalid credentials'));
  }
};
