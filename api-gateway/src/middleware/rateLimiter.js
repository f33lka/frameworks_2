import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ requestId: req.id, ip: req.ip }, 'Rate limit exceeded');
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  },
  skip: (req) => {
    return req.path === '/health';
  }
});
