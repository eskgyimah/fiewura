import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Notice period lookup by reason (in days)
const NOTICE_PERIODS: Record<string, number> = {
  NON_PAYMENT: 30,
  LEASE_VIOLATION: 30,
  PROPERTY_NEEDED: 90,
  LEASE_EXPIRED: 90,
};

// POST /api/evictions - Landlord issues eviction notice
export const issueNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { leaseId, reason, details } = req.body;

    if (!leaseId || !reason) {
      res.status(400).json({ error: 'leaseId and reason are required' });
      return;
    }

    // Validate reason
    if (!NOTICE_PERIODS[reason]) {
      res.status(400).json({
        error: 'Invalid reason. Must be one of: NON_PAYMENT, LEASE_VIOLATION, PROPERTY_NEEDED, LEASE_EXPIRED',
      });
      return;
    }

    // Verify lease exists and belongs to landlord's property
    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        property: { landlordId: user.id },
      },
      include: {
        property: true,
        tenant: { include: { user: { select: { name: true, phone: true } } } },
      },
    });

    if (!lease) {
      res.status(404).json({ error: 'Lease not found or access denied' });
      return;
    }

    // Auto-calculate notice period and effective date
    const noticePeriod = NOTICE_PERIODS[reason];
    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + noticePeriod);

    const notice = await prisma.evictionNotice.create({
      data: {
        leaseId,
        reason: reason as any,
        details: details || null,
        noticePeriod,
        effectiveDate,
        status: 'ISSUED',
      },
      include: {
        lease: {
          include: {
            property: { select: { address: true } },
            tenant: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('eviction-issued', {
        noticeId: notice.id,
        leaseId,
        reason,
        effectiveDate,
      });
    }

    res.status(201).json(notice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to issue eviction notice' });
  }
};

// GET /api/evictions/lease/:id - Get all notices for a lease
export const getNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notices = await prisma.evictionNotice.findMany({
      where: { leaseId: id },
      orderBy: { issuedAt: 'desc' },
    });

    res.json(notices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch eviction notices' });
  }
};

// PUT /api/evictions/:id/acknowledge - Tenant acknowledges eviction notice
export const acknowledgeNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notice = await prisma.evictionNotice.findUnique({ where: { id } });

    if (!notice) {
      res.status(404).json({ error: 'Eviction notice not found' });
      return;
    }

    if (notice.status !== 'ISSUED') {
      res.status(400).json({ error: `Cannot acknowledge notice with status: ${notice.status}` });
      return;
    }

    const updated = await prisma.evictionNotice.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('eviction-acknowledged', { noticeId: id });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to acknowledge eviction notice' });
  }
};
