import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSMS } from '../services/sms';

const prisma = new PrismaClient();

// GET /api/community/:propertyId/posts - Get posts for property (threaded)
export const getCommunityPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId } = req.params;

    // Check if user has access: landlord or tenant of the property
    const hasAccess = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [
          { landlordId: user.id },
          { tenants: { some: { userId: user.id } } }
        ]
      }
    });

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const posts = await prisma.communityPost.findMany({
      where: { propertyId, parentId: null }, // top-level posts only
      include: {
        user: { select: { id: true, name: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, role: true } },
            replies: true // nested replies
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [
        { pinned: 'desc' }, // pinned first
        { createdAt: 'desc' }
      ]
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// POST /api/community/:propertyId/posts - Post new post
export const postCommunityPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId } = req.params;
    const { content, type } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content required' });
      return;
    }

    // Check access
    const hasAccess = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [
          { landlordId: user.id },
          { tenants: { some: { userId: user.id } } }
        ]
      }
    });

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Type validation: only landlord can post ANNOUNCEMENT
    if (type === 'ANNOUNCEMENT' && !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Only landlords can post announcements' });
      return;
    }

    const post = await prisma.communityPost.create({
      data: {
        propertyId,
        userId: user.id,
        content,
        type: type || 'DISCUSSION'
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    });

    // Emit to Socket.io room
    const io = (req as any).io;
    if (io) {
      io.to(`community-${propertyId}`).emit('new-post', post);
    }

    // Send SMS for announcements
    if (post.type === 'ANNOUNCEMENT') {
      const propertyUsers = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          landlord: { select: { phone: true } },
          tenants: { include: { user: { select: { phone: true } } } }
        }
      });

      if (propertyUsers) {
        const phones: string[] = [];
        if (propertyUsers.landlord.phone) phones.push(propertyUsers.landlord.phone);
        propertyUsers.tenants.forEach(t => { if (t.user.phone) phones.push(t.user.phone); });

        const message = `Fie Wura Announcement: ${post.content}`;
        for (const phone of phones) {
          await sendSMS(phone, message);
        }
      }
    }

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post post' });
  }
};

// POST /api/community/:propertyId/posts/:postId/reply - Reply to a post
export const replyToPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId, postId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content required' });
      return;
    }

    // Check access
    const hasAccess = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [
          { landlordId: user.id },
          { tenants: { some: { userId: user.id } } }
        ]
      }
    });

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Verify parent post exists and belongs to property
    const parentPost = await prisma.communityPost.findFirst({
      where: { id: postId, propertyId }
    });

    if (!parentPost) {
      res.status(404).json({ error: 'Parent post not found' });
      return;
    }

    const reply = await prisma.communityPost.create({
      data: {
        propertyId,
        userId: user.id,
        content,
        parentId: postId,
        type: 'DISCUSSION' // replies are always discussion
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    });

    // Emit to Socket.io room
    const io = (req as any).io;
    if (io) {
      io.to(`community-${propertyId}`).emit('new-reply', reply);
    }

    res.status(201).json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post reply' });
  }
};

// PATCH /api/community/:propertyId/posts/:postId - Moderate post (landlord only: pin/unpin, delete)
export const moderatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { propertyId, postId } = req.params;
    const { action } = req.body; // 'pin', 'unpin', 'delete'

    // Check if post belongs to user's property
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, propertyId, property: { landlordId: user.id } }
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found or access denied' });
      return;
    }

    if (action === 'delete') {
      await prisma.communityPost.delete({
        where: { id: postId }
      });

      // Emit delete event
      const io = (req as any).io;
      if (io) {
        io.to(`community-${propertyId}`).emit('post-deleted', postId);
      }

      res.status(204).send();
    } else if (action === 'pin') {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { pinned: true }
      });

      // Emit pin event
      const io = (req as any).io;
      if (io) {
        io.to(`community-${propertyId}`).emit('post-pinned', postId);
      }

      res.json({ message: 'Post pinned' });
    } else if (action === 'unpin') {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { pinned: false }
      });

      // Emit unpin event
      const io = (req as any).io;
      if (io) {
        io.to(`community-${propertyId}`).emit('post-unpinned', postId);
      }

      res.json({ message: 'Post unpinned' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to moderate post' });
  }
};

// GET unread count for user
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Count posts where user is not in readBy array, for properties they have access to
    const unreadCount = await prisma.communityPost.count({
      where: {
        property: {
          OR: [
            { landlordId: user.id },
            { tenants: { some: { userId: user.id } } }
          ]
        },
        NOT: {
          readBy: {
            has: user.id
          }
        }
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// PUT /api/community/messages/:messageId/read - Mark as read
export const markMessageAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { messageId } = req.params;

    await prisma.communityMessage.update({
      where: { id: messageId },
      data: {
        readBy: {
          push: user.id
        }
      }
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};