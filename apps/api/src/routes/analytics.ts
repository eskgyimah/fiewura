import { Router } from 'express';
import { getAnalyticsOverview, getRevenueAnalytics, exportAnalyticsReport } from '../controllers/analytics.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/analytics/overview
router.get('/overview', authMiddleware, requireRole(['LANDLORD']), getAnalyticsOverview);

// GET /api/analytics/revenue
router.get('/revenue', authMiddleware, requireRole(['LANDLORD']), getRevenueAnalytics);

// GET /api/analytics/export - PDF report
router.get('/export', authMiddleware, requireRole(['LANDLORD']), exportAnalyticsReport);

export default router;