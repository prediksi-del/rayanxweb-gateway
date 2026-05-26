import { RedisService } from '../services/redis.service';
import { logger } from '../logger/winston.logger';

export class PresenceManager {
  private redis = RedisService.getClients().pubClient;
  private readonly KEY_PREFIX = 'presence:user:';

  public async setOnline(userId: string, socketId: string): Promise<void> {
    try {
      await this.redis.sadd(`${this.KEY_PREFIX}${userId}`, socketId);
      logger.debug(`Presence tracked: User ${userId} is online via socket ${socketId}`);
    } catch (error) {
      logger.error(`Error registering tracking for User ${userId}`, error);
    }
  }

  public async setOffline(userId: string, socketId: string): Promise<boolean> {
    try {
      const key = `${this.KEY_PREFIX}${userId}`;
      await this.redis.srem(key, socketId);
      const remaining = await this.redis.scard(key);
      return remaining === 0; // Mengembalikan true jika semua perangkat user telah putus (benar-benar offline)
    } catch (error) {
      logger.error(`Error removing tracking for User ${userId}`, error);
      return false;
    }
  }

  public async isUserOnline(userId: string): Promise<boolean> {
    const count = await this.redis.scard(`${this.KEY_PREFIX}${userId}`);
    return count > 0;
  }
}
