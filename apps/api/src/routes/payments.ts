import { Router } from 'express';
import { initiatePayment, handleWebhook, getReceipt, verifyPayment, getPendingPayments } from '../controllers/payment.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.post('/initiate', authMiddleware, requireRole(['TENANT']), initiatePayment);
router.post('/webhook', handleWebhook); // Public for Paystack
router.get('/:id/receipt', authMiddleware, getReceipt);
router.post('/verify', authMiddleware, verifyPayment);
router.get('/pending', authMiddleware, requireRole(['TENANT']), getPendingPayments);

export default router;