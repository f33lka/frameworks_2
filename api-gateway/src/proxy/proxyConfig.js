import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../config/logger.js';

const createProxyOptions = (target, pathRewrite) => ({
  target,
  changeOrigin: true,
  pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    if (req.id) {
      proxyReq.setHeader('X-Request-ID', req.id);
    }

    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.id);
      proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles));
    }

    logger.debug({
      requestId: req.id,
      method: req.method,
      path: req.path,
      target
    }, 'Proxying request');
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.debug({
      requestId: req.id,
      statusCode: proxyRes.statusCode
    }, 'Proxy response received');
  },
  onError: (err, req, res) => {
    logger.error({
      requestId: req.id,
      error: err.message
    }, 'Proxy error');

    res.status(502).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Upstream service is unavailable'
      }
    });
  }
});

export const usersServiceProxy = createProxyMiddleware(
  createProxyOptions(
    process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    { '^/api/v1/users': '/api/v1/users', '^/api/v1/auth': '/api/v1/auth' }
  )
);

export const ordersServiceProxy = createProxyMiddleware(
  createProxyOptions(
    process.env.ORDERS_SERVICE_URL || 'http://localhost:3002',
    { '^/api/v1/orders': '/api/v1/orders' }
  )
);
