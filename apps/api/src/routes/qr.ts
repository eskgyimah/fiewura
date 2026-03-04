import { Router } from 'express';
import { generateQr, joinViaQr } from '../controllers/qr.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Landlord generates QR token for a property
router.post('/properties/:id/generate-qr', authMiddleware, requireRole(['LANDLORD']), generateQr);

// Tenant joins a property via QR token
router.post('/properties/join', authMiddleware, requireRole(['TENANT']), joinViaQr);

export default router;
