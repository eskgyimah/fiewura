import { Router } from 'express';
import {
  createChallenge,
  getMyChallenges,
  getChallengeTimeline,
  assignChallenge,
  proposeAppointment,
  respondAppointment,
  completeChallenge,
  verifyChallenge,
} from '../controllers/maintenance-v2.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Tenant creates a maintenance challenge
router.post('/', authMiddleware, requireRole(['TENANT']), createChallenge);

// Tenant's challenges with response timeline
router.get('/my', authMiddleware, getMyChallenges);

// Full response history for a challenge
router.get('/:id/timeline', authMiddleware, getChallengeTimeline);

// Landlord assigns tech/vendor to challenge
router.put('/:id/assign', authMiddleware, requireRole(['LANDLORD']), assignChallenge);

// Tech proposes appointment date
router.post('/:id/appointment', authMiddleware, proposeAppointment);

// Tenant accepts/rejects appointment
router.put('/:id/appointment/respond', authMiddleware, respondAppointment);

// Tech marks challenge as done
router.put('/:id/complete', authMiddleware, completeChallenge);

// Tenant verifies challenge as fixed or unfixed
router.put('/:id/verify', authMiddleware, requireRole(['TENANT']), verifyChallenge);

export default router;
