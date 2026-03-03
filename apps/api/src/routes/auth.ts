import { Router } from 'express';
import { login, register, updateProfile, changePassword, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.put('/profile', authMiddleware, updateProfile);
router.put('/password', authMiddleware, changePassword);

export default router;