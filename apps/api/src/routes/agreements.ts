import { Router } from 'express';
import {
  createAgreement,
  getAgreement,
  signAgreement,
  getAgreementPdf,
} from '../controllers/agreement.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Landlord creates an agreement for a lease
router.post('/', authMiddleware, requireRole(['LANDLORD']), createAgreement);

// View agreement details
router.get('/:id', authMiddleware, getAgreement);

// Landlord or tenant signs the agreement
router.post('/:id/sign', authMiddleware, signAgreement);

// Generate PDF of the agreement
router.get('/:id/pdf', authMiddleware, getAgreementPdf);

export default router;
