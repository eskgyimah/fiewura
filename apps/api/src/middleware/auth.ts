import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true }
    });

    if (!user) {
      res.status(401).json({ error: 'Access denied. Invalid token.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Access denied. Invalid token.' });
  }
};

export const requireAssignmentAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assignmentId = req.params.assignmentId;
    if (!assignmentId) {
      res.status(400).json({ error: 'Assignment ID required' });
      return;
    }

    if (req.user.role === 'VENDOR') {
      // Check if vendor is assigned to this assignment
      const assignment = await prisma.maintenanceAssignment.findUnique({
        where: { id: assignmentId }
      });
      if (!assignment || assignment.vendorId !== req.user.id) {
        res.status(403).json({ error: 'Access denied. Not assigned to this task.' });
        return;
      }
    } else if (req.user.role === 'LANDLORD' || req.user.role === 'TENANT') {
      // Landlords can access assignments for their properties
      const assignment = await prisma.maintenanceAssignment.findUnique({
        where: { id: assignmentId },
        include: { maintenanceRequest: { include: { property: true } } }
      });
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }
      if (req.user.role === 'LANDLORD' && assignment.maintenanceRequest.property.landlordId !== req.user.id) {
        res.status(403).json({ error: 'Access denied. Not your property.' });
        return;
      }
      if (req.user.role === 'TENANT') {
        // Tenants can access assignments for their leased properties
        const lease = await prisma.lease.findFirst({
          where: {
            tenantId: req.user.tenant?.id,
            propertyId: assignment.maintenanceRequest.propertyId,
            status: 'ACTIVE'
          }
        });
        if (!lease) {
          res.status(403).json({ error: 'Access denied. No active lease for this property.' });
          return;
        }
      }
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient role' });
      return;
    }
    next();
  };
};

export const requirePropertyAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const propertyId = req.params.propertyId || req.body.propertyId;

    if (!propertyId) {
      res.status(400).json({ error: 'Property ID required' });
      return;
    }

    if (req.user.role === 'LANDLORD') {
      // Check if landlord owns the property
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      });
      if (!property || property.landlordId !== req.user.id) {
        res.status(403).json({ error: 'Forbidden: Not your property' });
        return;
      }
    } else if (req.user.role === 'TENANT') {
      // Check if tenant is linked to the property
      const tenant = await prisma.tenant.findFirst({
        where: { userId: req.user.id, propertyId }
      });
      if (!tenant) {
        res.status(403).json({ error: 'Forbidden: Not your property' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const requireVendorAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assignmentId = req.params.assignmentId || req.body.assignmentId;

    if (!assignmentId) {
      res.status(400).json({ error: 'Assignment ID required' });
      return;
    }

    if (req.user.role === 'VENDOR') {
      // Check if vendor is assigned to the maintenance
      const assignment = await prisma.maintenanceAssignment.findUnique({
        where: { id: assignmentId }
      });
      if (!assignment || assignment.vendorId !== req.user.id) {
        res.status(403).json({ error: 'Forbidden: Not your assignment' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};