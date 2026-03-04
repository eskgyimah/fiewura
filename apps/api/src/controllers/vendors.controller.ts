import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/vendors - List all vendors (FIEWURA only)
export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(vendors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

// POST /api/vendors - Create new vendor
export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { name, phone, specialties, rating, notes } = req.body;

    if (!name || !phone || !specialties || !Array.isArray(specialties)) {
      res.status(400).json({ error: 'Name, phone, and specialties array required' });
      return;
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        phone,
        specialties,
        rating: rating || 0,
        notes
      }
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
};

// PUT /api/vendors/:id - Update vendor
export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { id } = req.params;
    const { name, phone, specialties, rating, notes } = req.body;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        phone,
        specialties,
        rating,
        notes
      }
    });

    res.json(vendor);
  } catch (error) {
    console.error(error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ error: 'Vendor not found' });
    } else {
      res.status(500).json({ error: 'Failed to update vendor' });
    }
  }
};

// DELETE /api/vendors/:id - Delete vendor
export const deleteVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user || !['LANDLORD', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { id } = req.params;

    await prisma.vendor.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    if ((error as any).code === 'P2025') {
      res.status(404).json({ error: 'Vendor not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete vendor' });
    }
  }
};