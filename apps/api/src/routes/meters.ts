import { Router } from 'express';
import {
  addMeter,
  getPropertyMeters,
  submitReading,
  getReadingHistory,
} from '../controllers/meter.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Landlord adds a meter to a property
router.post('/', authMiddleware, requireRole(['LANDLORD']), addMeter);

// Get all meters for a property
router.get('/property/:id', authMiddleware, getPropertyMeters);

// Submit a meter reading
router.post('/:id/reading', authMiddleware, submitReading);

// Get reading history for a meter
router.get('/:id/history', authMiddleware, getReadingHistory);

export default router;
