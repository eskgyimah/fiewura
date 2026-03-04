import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// POST /api/qr/properties/:id/generate-qr - Landlord generates QR token for property
export const generateQr = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Verify property exists and belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id, landlordId: user.id },
    });

    if (!property) {
      res.status(404).json({ error: 'Property not found or access denied' });
      return;
    }

    // Generate signed JWT with 24h expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const token = jwt.sign(
      {
        propertyId: id,
        landlordId: user.id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store token and expiry on the property
    await prisma.property.update({
      where: { id },
      data: {
        qrToken: token,
        qrExpiresAt: expiresAt,
      },
    });

    res.json({
      token,
      expiresAt,
      propertyId: id,
      message: 'QR token generated. Use this token to render a QR code on the frontend.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate QR token' });
  }
};

// POST /api/qr/properties/join - Tenant joins property via QR token
export const joinViaQr = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'token is required' });
      return;
    }

    // Verify and decode the JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      res.status(400).json({ error: 'Invalid or expired QR token' });
      return;
    }

    const { propertyId } = decoded;

    // Verify property exists and token matches
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Check token matches what's stored and hasn't expired
    if (property.qrToken !== token) {
      res.status(400).json({ error: 'QR token has been invalidated' });
      return;
    }

    if (property.qrExpiresAt && property.qrExpiresAt < new Date()) {
      res.status(400).json({ error: 'QR token has expired' });
      return;
    }

    // Check if tenant already exists for this user
    const existingTenant = await prisma.tenant.findFirst({
      where: { userId: user.id },
    });

    if (existingTenant) {
      res.status(409).json({ error: 'You are already registered as a tenant' });
      return;
    }

    // Create Tenant record
    const tenant = await prisma.tenant.create({
      data: {
        userId: user.id,
        propertyId,
      },
    });

    // Create Lease (1 year, using property rent amount)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const lease = await prisma.lease.create({
      data: {
        propertyId,
        tenantId: tenant.id,
        startDate,
        endDate,
        rentAmount: property.rentAmount,
        status: 'ACTIVE',
      },
    });

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('tenant-joined', {
        propertyId,
        tenantId: tenant.id,
        userId: user.id,
      });
    }

    res.status(201).json({
      message: 'Successfully joined property',
      tenant,
      lease,
      property: {
        id: property.id,
        address: property.address,
        city: property.city,
        rentAmount: property.rentAmount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join via QR' });
  }
};
