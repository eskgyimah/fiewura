import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/meters - Landlord adds a meter to a property
export const addMeter = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { propertyId, type, meterId } = req.body;

    if (!propertyId || !type || !meterId) {
      res.status(400).json({ error: 'propertyId, type, and meterId are required' });
      return;
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: user.id },
    });

    if (!property) {
      res.status(404).json({ error: 'Property not found or access denied' });
      return;
    }

    // Check for duplicate meterId on the same property
    const existing = await prisma.meter.findFirst({
      where: { propertyId, meterId },
    });

    if (existing) {
      res.status(409).json({ error: 'A meter with this ID already exists on this property' });
      return;
    }

    const meter = await prisma.meter.create({
      data: {
        propertyId,
        type,
        meterId,
      },
    });

    res.status(201).json(meter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add meter' });
  }
};

// GET /api/meters/property/:id - Get all meters for a property
export const getPropertyMeters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const meters = await prisma.meter.findMany({
      where: { propertyId: id },
      include: {
        readings: {
          orderBy: { recordedAt: 'desc' },
          take: 1, // latest reading only
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(meters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meters' });
  }
};

// POST /api/meters/:id/reading - Submit a meter reading
export const submitReading = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { value, photoUrl } = req.body;

    if (value === undefined || value === null) {
      res.status(400).json({ error: 'value is required' });
      return;
    }

    // Verify meter exists
    const meter = await prisma.meter.findUnique({ where: { id } });
    if (!meter) {
      res.status(404).json({ error: 'Meter not found' });
      return;
    }

    const reading = await prisma.meterReading.create({
      data: {
        meterId: id,
        value: parseFloat(value),
        photoUrl: photoUrl || null,
        recordedBy: user.id,
      },
      include: {
        recorder: { select: { name: true, role: true } },
      },
    });

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('meter-reading-submitted', { meterId: id, reading });
    }

    res.status(201).json(reading);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit reading' });
  }
};

// GET /api/meters/:id/history - Get reading history for a meter
export const getReadingHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify meter exists
    const meter = await prisma.meter.findUnique({ where: { id } });
    if (!meter) {
      res.status(404).json({ error: 'Meter not found' });
      return;
    }

    const readings = await prisma.meterReading.findMany({
      where: { meterId: id },
      include: {
        recorder: { select: { name: true, role: true } },
      },
      orderBy: { recordedAt: 'desc' },
    });

    res.json({ meter, readings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reading history' });
  }
};
