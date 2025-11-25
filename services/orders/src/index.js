import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'orders-service',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/v1/orders', orderRoutes);

app.use((req, res) => {
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
  logger.info(`Orders service listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
