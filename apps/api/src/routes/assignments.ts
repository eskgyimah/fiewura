import { Router } from 'express';
import { assignMaintenance, getMaintenanceAssignments, updateAssignment, getVendorAssignments, respondToSchedule, updateCosts, uploadPhotos, initiatePayout, getCalendarAssignments, getVendorJobs } from '../controllers/maintenanceAssignment.controller';
import { authMiddleware, requireRole, requireAssignmentAccess } from '../middleware/auth';

const router = Router();

// Assign maintenance to vendor
router.post('/maintenance/:id/assign', authMiddleware, requireRole(['LANDLORD']), assignMaintenance);

// Get assignments for maintenance
router.get('/maintenance/:id/assignments', authMiddleware, requireRole(['LANDLORD', 'TENANT']), getMaintenanceAssignments);

// Update assignment
router.put('/:id', authMiddleware, requireAssignmentAccess, updateAssignment);

// Respond to schedule proposal
router.post('/:id/respond-schedule', authMiddleware, requireAssignmentAccess, respondToSchedule);

// Update costs
router.put('/:id/update-costs', authMiddleware, requireAssignmentAccess, updateCosts);

// Upload photos
router.post('/:id/upload-photos', authMiddleware, requireAssignmentAccess, uploadPhotos);

// Initiate payout
router.post('/:id/payout', authMiddleware, requireRole(['LANDLORD']), initiatePayout);

// Get calendar events
router.get('/calendar', authMiddleware, requireRole(['LANDLORD', 'TENANT', 'VENDOR']), getCalendarAssignments);

// Get assignments for vendor
router.get('/vendors/:id/assignments', authMiddleware, requireRole(['VENDOR']), getVendorAssignments);

// Get vendor jobs
router.get('/vendor/jobs', authMiddleware, requireRole(['VENDOR']), getVendorJobs);

export default router;