import { Router } from 'express';
import { getProperties, createProperty, upload } from '../controllers/properties.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, requireRole(['LANDLORD']), getProperties);
router.post('/', authMiddleware, requireRole(['LANDLORD']), upload.array('images', 5), createProperty);

export default router;