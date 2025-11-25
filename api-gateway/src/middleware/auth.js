import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

const publicPaths = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/health'
];

export const authMiddleware = (req, res, next) => {
  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));

  if (isPublicPath) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn({ requestId: req.id, path: req.path }, 'Missing authentication token');
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.debug({ requestId: req.id, userId: decoded.id }, 'Token verified');
    next();
  } catch (error) {
    logger.warn({ requestId: req.id, error: error.message }, 'Invalid token');
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired token'
      }
    });
  }
};
