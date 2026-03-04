import { Router } from 'express';
import { getPolicies } from '../controllers/policies.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get Ghana housing policy summaries
router.get('/', authMiddleware, getPolicies);

export default router;
