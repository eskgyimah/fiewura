import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/maintenance-v2 - Tenant creates a maintenance challenge
export const createChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    let { description, category, photos, propertyId } = req.body;

    if (!description) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    // If propertyId not provided, resolve from tenant record
    if (!propertyId) {
      const tenant = await prisma.tenant.findFirst({
        where: { userId: user.id },
      });
      if (!tenant) {
        res.status(400).json({ error: 'No tenant record found. Provide propertyId.' });
        return;
      }
      propertyId = tenant.propertyId;
    }

    // Verify property exists
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const challenge = await prisma.maintenance.create({
      data: {
        propertyId,
        tenantId: user.id,
        description,
        category: category || 'OTHER',
        photos: photos || [],
        status: 'PENDING',
      },
      include: { property: true },
    });

    // Create initial ChallengeResponse record
    await prisma.challengeResponse.create({
      data: {
        maintenanceId: challenge.id,
        responderId: user.id,
        type: 'WORK_STARTED',
        message: `Challenge created: ${description}`,
        photos: photos || [],
      },
    });

    // Emit Socket.io event to landlord
    const io = (req as any).io;
    if (io) {
      io.emit('challenge-created', challenge);
    }

    res.status(201).json(challenge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

// GET /api/maintenance-v2 - All challenges for landlord's properties
export const getAllChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const challenges = await prisma.maintenance.findMany({
      where: {
        property: { landlordId: user.id },
      },
      include: {
        property: { select: { address: true, city: true } },
        tenant: { select: { name: true, phone: true } },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: { responder: { select: { name: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(challenges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

// GET /api/maintenance-v2/my - Tenant's challenges with response timeline
export const getMyChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const challenges = await prisma.maintenance.findMany({
      where: { tenantId: user.id },
      include: {
        property: { select: { address: true, city: true } },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: { responder: { select: { name: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(challenges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

// GET /api/maintenance-v2/:id/timeline - Full response history for a challenge
export const getChallengeTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const challenge = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        property: { select: { address: true, city: true, landlordId: true } },
        tenant: { select: { name: true, phone: true } },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: { responder: { select: { id: true, name: true, role: true } } },
        },
        assignments: {
          include: { vendor: { select: { name: true, phone: true } } },
        },
      },
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    res.json(challenge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch challenge timeline' });
  }
};

// PUT /api/maintenance-v2/:id/assign - Landlord assigns tech/vendor
export const assignChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      res.status(400).json({ error: 'vendorId is required' });
      return;
    }

    // Verify challenge exists and belongs to landlord's property
    const challenge = await prisma.maintenance.findFirst({
      where: { id, property: { landlordId: user.id } },
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found or access denied' });
      return;
    }

    // Create assignment
    const assignment = await prisma.maintenanceAssignment.create({
      data: {
        maintenanceRequestId: id,
        vendorId,
        status: 'ASSIGNED',
      },
      include: { vendor: true },
    });

    // Update challenge status
    await prisma.maintenance.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    // Create ChallengeResponse record
    await prisma.challengeResponse.create({
      data: {
        maintenanceId: id,
        responderId: user.id,
        type: 'WORK_STARTED',
        message: `Assigned to vendor: ${assignment.vendor.name}`,
      },
    });

    const io = (req as any).io;
    if (io) {
      io.emit('challenge-assigned', { challengeId: id, assignment });
    }

    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign challenge' });
  }
};

// POST /api/maintenance-v2/:id/appointment - Tech proposes appointment date
export const proposeAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { appointmentDate } = req.body;

    if (!appointmentDate) {
      res.status(400).json({ error: 'appointmentDate is required' });
      return;
    }

    const challenge = await prisma.maintenance.findUnique({ where: { id } });
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    // Update appointment date on challenge
    await prisma.maintenance.update({
      where: { id },
      data: { appointmentDate: new Date(appointmentDate) },
    });

    // Create ChallengeResponse record
    const response = await prisma.challengeResponse.create({
      data: {
        maintenanceId: id,
        responderId: user.id,
        type: 'APPOINTMENT_PROPOSED',
        message: `Appointment proposed for ${new Date(appointmentDate).toDateString()}`,
      },
    });

    const io = (req as any).io;
    if (io) {
      io.emit('appointment-proposed', { challengeId: id, appointmentDate, response });
    }

    res.json({ message: 'Appointment proposed', appointmentDate, response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to propose appointment' });
  }
};

// PUT /api/maintenance-v2/:id/appointment/respond - Tenant accepts/rejects appointment
export const respondAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { action, counterDate } = req.body;

    if (!action || !['accept', 'reject'].includes(action)) {
      res.status(400).json({ error: 'action must be "accept" or "reject"' });
      return;
    }

    const challenge = await prisma.maintenance.findUnique({ where: { id } });
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    let responseType: 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_REJECTED';
    let message: string;

    if (action === 'accept') {
      responseType = 'APPOINTMENT_CONFIRMED';
      message = `Appointment confirmed for ${challenge.appointmentDate?.toDateString()}`;
    } else {
      responseType = 'APPOINTMENT_REJECTED';
      message = counterDate
        ? `Appointment rejected. Counter-proposed: ${new Date(counterDate).toDateString()}`
        : 'Appointment rejected';

      // Update appointment date to counter proposal if provided
      if (counterDate) {
        await prisma.maintenance.update({
          where: { id },
          data: { appointmentDate: new Date(counterDate) },
        });
      }
    }

    const response = await prisma.challengeResponse.create({
      data: {
        maintenanceId: id,
        responderId: user.id,
        type: responseType,
        message,
      },
    });

    const io = (req as any).io;
    if (io) {
      io.emit('appointment-response', { challengeId: id, action, response });
    }

    res.json({ message: `Appointment ${action}ed`, response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to respond to appointment' });
  }
};

// PUT /api/maintenance-v2/:id/complete - Tech marks challenge as done
export const completeChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { photos, message } = req.body;

    const challenge = await prisma.maintenance.findUnique({ where: { id } });
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    // Update challenge status to COMPLETED
    await prisma.maintenance.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    // Create ChallengeResponse record
    const response = await prisma.challengeResponse.create({
      data: {
        maintenanceId: id,
        responderId: user.id,
        type: 'WORK_COMPLETED',
        message: message || 'Work completed',
        photos: photos || [],
      },
    });

    const io = (req as any).io;
    if (io) {
      io.emit('challenge-completed', { challengeId: id, response });
    }

    res.json({ message: 'Challenge marked as completed', response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
};

// PUT /api/maintenance-v2/:id/verify - Tenant marks fixed or unfixed
export const verifyChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { verified, message } = req.body;

    if (typeof verified !== 'boolean') {
      res.status(400).json({ error: 'verified (boolean) is required' });
      return;
    }

    const challenge = await prisma.maintenance.findUnique({ where: { id } });
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    let responseType: 'TENANT_CONFIRMED_FIXED' | 'TENANT_MARKED_UNFIXED';
    let updateData: any = { tenantVerified: verified };

    if (verified) {
      responseType = 'TENANT_CONFIRMED_FIXED';
    } else {
      responseType = 'TENANT_MARKED_UNFIXED';
      // Reopen the challenge
      updateData.status = 'PENDING';
      updateData.reopenCount = { increment: 1 };
    }

    await prisma.maintenance.update({
      where: { id },
      data: updateData,
    });

    const response = await prisma.challengeResponse.create({
      data: {
        maintenanceId: id,
        responderId: user.id,
        type: responseType,
        message: message || (verified ? 'Issue confirmed fixed' : 'Issue not fixed'),
      },
    });

    const io = (req as any).io;
    if (io) {
      io.emit('challenge-verified', { challengeId: id, verified, response });
    }

    res.json({ message: verified ? 'Challenge verified as fixed' : 'Challenge marked as unfixed', response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify challenge' });
  }
};
