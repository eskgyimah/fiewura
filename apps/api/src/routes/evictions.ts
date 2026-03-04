import { Router } from 'express';
import {
  issueNotice,
  getNotices,
  acknowledgeNotice,
} from '../controllers/eviction.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Landlord issues an eviction notice
router.post('/', authMiddleware, requireRole(['LANDLORD']), issueNotice);

// Get all eviction notices for a lease
router.get('/lease/:id', authMiddleware, getNotices);

// Tenant acknowledges eviction notice
router.put('/:id/acknowledge', authMiddleware, acknowledgeNotice);

export default router;
