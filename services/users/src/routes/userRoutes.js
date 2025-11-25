import express from 'express';
import { getProfile, updateProfile, listUsers } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/list', authenticateToken, requireRole(['admin']), listUsers);

export default router;
