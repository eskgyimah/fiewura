import { Router } from 'express';
import { getCommunityPosts, postCommunityPost, replyToPost, moderatePost, getUnreadCount } from '../controllers/community.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/:propertyId/posts', authMiddleware, getCommunityPosts);
router.post('/:propertyId/posts', authMiddleware, postCommunityPost);
router.post('/:propertyId/posts/:postId/reply', authMiddleware, replyToPost);
router.patch('/:propertyId/posts/:postId', authMiddleware, requireRole(['LANDLORD']), moderatePost);
router.get('/unread-count', authMiddleware, getUnreadCount);

export default router;