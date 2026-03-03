import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSMS } from '../services/sms';
import Paystack from 'paystack-api';

const prisma = new PrismaClient();

// POST /api/maintenance/:id/assign - Assign maintenance to vendor (LANDLORD/FIEWURA only)
export const assignMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { id } = req.params; // maintenance id
    const { vendorId, proposedSchedule, notes, costEstimate } = req.body;

    if (!vendorId) {
      res.status(400).json({ error: 'Vendor ID required' });
      return;
    }

    // Check if maintenance exists and belongs to user's properties
    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        property: { landlordId: user.id }
      },
      include: { property: true }
    });

    if (!maintenance) {
      res.status(404).json({ error: 'Maintenance request not found or access denied' });
      return;
    }

    const assignment = await prisma.maintenanceAssignment.create({
      data: {
        maintenanceRequestId: id,
        vendorId,
        proposedSchedule: proposedSchedule ? new Date(proposedSchedule) : null,
        notes,
        costEstimate
      },
      include: {
        vendor: true,
        maintenanceRequest: true
      }
    });

    // Send SMS to vendor
    const smsMessage = `New job from Fie Wura: ${maintenance.category} at ${maintenance.property.address}. Proposed: ${proposedSchedule || 'TBD'}. Reply ACCEPT or call ${user.phone || 'landlord'}`;
    await sendSMS(assignment.vendor.phone, smsMessage);

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('assignment-new', assignment);
      io.emit('maintenance-assigned', assignment);
    }

    res.status(201).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign maintenance' });
  }
};

// GET /api/maintenance/:id/assignments - Get assignments for maintenance
export const getMaintenanceAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check access: landlord or tenant who owns the request
    let whereCondition: any = { maintenanceRequestId: id };

    if (!['LANDLORD', 'FIEWURA'].includes(user.role)) {
      whereCondition.maintenanceRequest = { tenantId: user.id };
    } else {
      whereCondition.maintenanceRequest = { property: { landlordId: user.id } };
    }

    const assignments = await prisma.maintenanceAssignment.findMany({
      where: whereCondition,
      include: {
        vendor: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

// PUT /api/assignments/:id - Update assignment (LANDLORD/FIEWURA or TECH_TEAM)
export const updateAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { status, proposedSchedule, notes, costEstimate } = req.body;

    // Check if user can update: landlord or assigned vendor's TECH_TEAM
    const assignment = await prisma.maintenanceAssignment.findUnique({
      where: { id },
      include: {
        maintenanceRequest: { include: { property: true } },
        vendor: true
      }
    });

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const canUpdate = ['LANDLORD', 'ADMIN'].includes(user.role) ||
                      (user.role === 'TECH_TEAM' && assignment.vendorId === user.vendorId); // assume user has vendorId

    if (!canUpdate) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await prisma.maintenanceAssignment.update({
      where: { id },
      data: {
        status,
        proposedSchedule: proposedSchedule ? new Date(proposedSchedule) : undefined,
        notes,
        costEstimate
      },
      include: {
        vendor: true,
        maintenanceRequest: true
      }
    });

    // Emit update event
    const io = (req as any).io;
    if (io) {
      io.emit('assignment-updated', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
};

// GET /api/vendors/:id/assignments - Get assignments for vendor (TECH_TEAM)
export const getVendorAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'TECH_TEAM') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { id } = req.params; // vendor id

    // Assume TECH_TEAM has vendorId in user, or check if user is associated
    // For simplicity, allow if TECH_TEAM role

    const assignments = await prisma.maintenanceAssignment.findMany({
      where: { vendorId: id },
      include: {
        maintenanceRequest: { include: { property: true, tenant: true } }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor assignments' });
  }
};

// POST /api/assignments/:id/respond-schedule - Tech responds to proposed schedule (accept/reject with counter)
export const respondToSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { action, counterProposal } = req.body; // action: 'accept' | 'reject', counterProposal: Date?

    const assignment = await prisma.maintenanceAssignment.findUnique({
      where: { id },
      include: { vendor: true, maintenanceRequest: { include: { property: true, tenant: true } } }
    });

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    let updateData: any = {};
    if (action === 'accept') {
      updateData.confirmedSchedule = assignment.proposedSchedule;
      updateData.status = 'SCHEDULED';
    } else if (action === 'reject' && counterProposal) {
      updateData.counterProposal = new Date(counterProposal);
      updateData.status = 'PENDING';
    }

    const updated = await prisma.maintenanceAssignment.update({
      where: { id },
      data: updateData,
      include: { vendor: true, maintenanceRequest: true }
    });

    // Send SMS to tenant on status change
    if (updated.status === 'SCHEDULED' && assignment.maintenanceRequest.tenant.user.phone) {
      const sms = `Fie Wura Update: Your maintenance is scheduled for ${updated.confirmedSchedule?.toDateString()}`;
      await sendSMS(assignment.maintenanceRequest.tenant.user.phone, sms);
    }

    // Emit event
    const io = (req as any).io;
    if (io) {
      io.emit('schedule-confirmed', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to respond to schedule' });
  }
};

// PUT /api/assignments/:id/update-costs - Update estimated/actual costs
export const updateCosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { estimatedCost, actualCost } = req.body;

    const updated = await prisma.maintenanceAssignment.update({
      where: { id },
      data: { estimatedCost, actualCost },
      include: { vendor: true, maintenanceRequest: true }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update costs' });
  }
};

// POST /api/assignments/:id/upload-photos - Upload before/after/receipt photos
export const uploadPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, urls } = req.body; // type: 'before' | 'after' | 'receipt', urls: string[]

    let updateData: any = {};
    if (type === 'before') {
      updateData.beforePhotos = { push: urls };
    } else if (type === 'after') {
      updateData.afterPhotos = { push: urls };
    } else if (type === 'receipt') {
      updateData.receiptPhoto = urls[0]; // single
      updateData.status = 'COMPLETED'; // assume completion on receipt upload
    }

    const updated = await prisma.maintenanceAssignment.update({
      where: { id },
      data: updateData,
      include: { vendor: true, maintenanceRequest: true }
    });

    // Notify tenant
    if (updated.status === 'COMPLETED' && updated.maintenanceRequest.tenant.user.phone) {
      const sms = `Fie Wura: Your maintenance is completed. Check app for photos and receipt.`;
      await sendSMS(updated.maintenanceRequest.tenant.user.phone, sms);
    }

    // Emit event
    const io = (req as any).io;
    if (io) {
      io.emit('job-completed', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
};

// POST /api/assignments/:id/payout - Initiate payout to vendor after landlord approval
export const initiatePayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { id } = req.params; // assignment id
    const { amount, recipientType, recipientCode } = req.body; // recipientType: 'bank' or 'mobile_money', recipientCode: account number or MoMo code

    if (!amount || !recipientType || !recipientCode) {
      res.status(400).json({ error: 'Amount, recipient type, and code required' });
      return;
    }

    // Check if assignment exists, is completed, and belongs to landlord
    const assignment = await prisma.maintenanceAssignment.findUnique({
      where: { id },
      include: {
        maintenanceRequest: { include: { property: true } },
        vendor: true
      }
    });

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.maintenanceRequest.property.landlordId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (assignment.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Assignment must be completed before payout' });
      return;
    }

    // Check if payout already exists
    const existingPayout = await prisma.vendorPayout.findUnique({
      where: { assignmentId: id }
    });

    if (existingPayout) {
      res.status(400).json({ error: 'Payout already initiated' });
      return;
    }

    // Create payout record
    const payout = await prisma.vendorPayout.create({
      data: {
        assignmentId: id,
        amount,
        vendorId: assignment.vendorId,
        status: 'PENDING'
      }
    });

    // Initiate Paystack transfer
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
    try {
      const transfer = await paystack.transfer.create({
        source: 'balance',
        amount: amount * 100, // in kobo
        recipient: recipientCode, // assume recipient code is pre-created
        reason: `Payout for maintenance job ${assignment.maintenanceRequest.description}`
      });

      // Update payout with reference
      await prisma.vendorPayout.update({
        where: { id: payout.id },
        data: {
          status: 'INITIATED',
          reference: transfer.data.reference
        }
      });

      // Send SMS to vendor
      const smsMessage = `Fie Wura Payment: GHS ${amount} sent for job "${assignment.maintenanceRequest.description}". Check your MoMo/bank. Ref: ${transfer.data.reference}`;
      await sendSMS(assignment.vendor.phone, smsMessage);

      res.json({ message: 'Payout initiated', reference: transfer.data.reference });
    } catch (transferError) {
      console.error('Paystack transfer failed:', transferError);

      // Update payout status to FAILED
      await prisma.vendorPayout.update({
        where: { id: payout.id },
        data: { status: 'FAILED' }
      });

      res.status(500).json({ error: 'Failed to initiate payout' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate payout' });
  }
};

// GET /api/assignments/calendar - Get maintenance assignments for calendar view
export const getCalendarAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { start, end } = req.query;

    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Get assignments for landlord's properties
    const assignments = await prisma.maintenanceAssignment.findMany({
      where: {
        maintenanceRequest: {
          property: { landlordId: user.id }
        },
        OR: [
          { proposedSchedule: { gte: startDate, lte: endDate } },
          { confirmedSchedule: { gte: startDate, lte: endDate } }
        ]
      },
      include: {
        maintenanceRequest: { include: { property: true } },
        vendor: { select: { name: true, phone: true } }
      }
    });

    // Format for calendar
    const events = assignments.map(assignment => ({
      id: assignment.id,
      title: `${assignment.maintenanceRequest.description} (${assignment.vendor.name})`,
      start: assignment.confirmedSchedule || assignment.proposedSchedule,
      status: assignment.status,
      property: assignment.maintenanceRequest.property.address,
      vendor: assignment.vendor
    }));

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
};

// GET /api/vendor/jobs - Get assigned maintenance jobs for vendor
export const getVendorJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    // Enforce vendor-only access
    if (user.role !== 'VENDOR') {
      res.status(403).json({ error: 'Access denied. Vendor only.' });
      return;
    }

    // Fetch assignments for the vendor
    const assignments = await prisma.maintenanceAssignment.findMany({
      where: {
        vendorId: user.id
      },
      include: {
        maintenanceRequest: {
          include: {
            property: { select: { address: true } },
            tenant: { select: { user: { select: { name: true, phone: true } } } }
          }
        },
        vendorPayout: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format response with job status and payout status
    const jobs = assignments.map(assignment => ({
      id: assignment.id,
      status: assignment.status, // pending, scheduled, in-progress, completed
      description: assignment.maintenanceRequest.description,
      property: assignment.maintenanceRequest.property.address,
      tenant: assignment.maintenanceRequest.tenant.user,
      proposedSchedule: assignment.proposedSchedule,
      confirmedSchedule: assignment.confirmedSchedule,
      costEstimate: assignment.costEstimate,
      actualCost: assignment.actualCost,
      payoutStatus: assignment.vendorPayout ? assignment.vendorPayout.status : 'Not Initiated' // unpaid, paid, failed
    }));

    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor jobs' });
  }
};