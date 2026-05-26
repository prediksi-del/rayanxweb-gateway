import rateLimit from 'express-rate-limit';

export const httpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // batasi setiap IP hingga 100 permintaan per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.' },
});
