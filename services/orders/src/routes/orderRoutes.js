import express from 'express';
import { createOrder, getOrder, listOrders, updateOrderStatus, cancelOrder } from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, createOrder);
router.get('/', authenticateToken, listOrders);
router.get('/:id', authenticateToken, getOrder);
router.put('/:id/status', authenticateToken, updateOrderStatus);
router.delete('/:id', authenticateToken, cancelOrder);

export default router;
