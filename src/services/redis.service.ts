import Redis from 'ioredis';
import { ENV } from '../config/env';
import { logger } from '../logger/winston.logger';

export class RedisService {
  private static pubClientInstance: Redis;
  private static subClientInstance: Redis;

  public static getClients() {
    if (!this.pubClientInstance || !this.subClientInstance) {
      const options = {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        reconnectOnError: (err: Error) => {
          logger.error('Redis connection error occurred:', err);
          return true;
        }
      };

      this.pubClientInstance = new Redis(ENV.REDIS_URL, options);
      this.subClientInstance = new Redis(ENV.REDIS_URL, options);

      this.pubClientInstance.on('connect', () => logger.info('⚡ Redis Pub Client Connected'));
      this.subClientInstance.on('connect', () => logger.info('⚡ Redis Sub Client Connected'));
      
      this.pubClientInstance.on('error', (err) => logger.error('Redis Pub Error', err));
      this.subClientInstance.on('error', (err) => logger.error('Redis Sub Error', err));
    }

    return {
      pubClient: this.pubClientInstance,
      subClient: this.subClientInstance
    };
  }

  public static async closeConnections(): Promise<void> {
    if (this.pubClientInstance) await this.pubClientInstance.quit();
    if (this.subClientInstance) await this.subClientInstance.quit();
    logger.info('🛑 Redis connections closed gracefully.');
  }
}
