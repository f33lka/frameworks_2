import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { usersServiceProxy, ordersServiceProxy } from './proxy/proxyConfig.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID']
}));

app.use(express.json());
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));
app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'api-gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      upstreamServices: {
        users: process.env.USERS_SERVICE_URL,
        orders: process.env.ORDERS_SERVICE_URL
      }
    }
  });
});

app.use(authMiddleware);

app.use('/api/v1/auth', usersServiceProxy);
app.use('/api/v1/users', usersServiceProxy);
app.use('/api/v1/orders', ordersServiceProxy);

app.use((req, res) => {
  logger.warn({ requestId: req.id, path: req.path }, 'Route not found');
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

app.use((err, req, res, next) => {
  logger.error({ requestId: req.id, error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Users service: ${process.env.USERS_SERVICE_URL}`);
  logger.info(`Orders service: ${process.env.ORDERS_SERVICE_URL}`);
});
