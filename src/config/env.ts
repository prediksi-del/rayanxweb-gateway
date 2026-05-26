import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '8080',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secure-enterprise-gateway-secret-key',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || '*',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
