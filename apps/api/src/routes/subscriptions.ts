import { Router } from 'express';
import { getCurrentSubscription, createSubscription, upgradeSubscription, cancelSubscription } from '../controllers/subscription.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/current', authMiddleware, getCurrentSubscription);
router.post('/create', authMiddleware, requireRole(['LANDLORD']), createSubscription);
router.put('/upgrade', authMiddleware, requireRole(['LANDLORD']), upgradeSubscription);
router.post('/cancel', authMiddleware, requireRole(['LANDLORD']), cancelSubscription);

export default router;
