import http from 'http';
import app from './app';
import { SocketServerManager } from '../socket/socket-manager';
import { ENV } from '../config/env';
import { logger } from '../logger/winston.logger';
import { RedisService } from '../services/redis.service';

const server = http.createServer(app);

// Inisialisasi Socket Server Manager Terpusat
new SocketServerManager(server);

const PORT = ENV.PORT;

server.listen(PORT, () => {
  logger.info(`===========================================================`);
  logger.info(`🔥 RAYANXWEB CENTRAL WEBSOCKET GATEWAY RUNNING ON PORT: ${PORT}`);
  logger.info(`🚀 NODE ENVIRONMENT MODE: ${ENV.NODE_ENV}`);
  logger.info(`===========================================================`);
});

// Graceful Shutdown Handler
const handleTermination = async (signal: string) => {
  logger.info(`Received system signal ${signal}. Initiating graceful termination procedures...`);
  
  server.close(async () => {
    logger.info('HTTP and WebSocket server structural links dissolved.');
    await RedisService.closeConnections();
    logger.info('System components successfully parked. Exiting runtime environment.');
    process.exit(0);
  });

  // Proteksi jika proses shutdown menggantung melebihi ambang batas toleransi
  setTimeout(() => {
    logger.error('Forced hardware termination invoked due to shutdown latency timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleTermination('SIGTERM'));
process.on('SIGINT', () => handleTermination('SIGINT'));
