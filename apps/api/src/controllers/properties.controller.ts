import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const prisma = new PrismaClient();

// Multer config for property images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/properties/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// GET /api/properties - Get properties scoped by role
export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const role = user.role;

    if (role === 'LANDLORD') {
      const properties = await prisma.property.findMany({
        where: { landlordId: user.id },
        include: { tenants: { include: { user: { select: { name: true } } } } }
      });
      res.json(properties);
      return;
    }

    if (role === 'TENANT') {
      const tenant = await prisma.tenant.findFirst({ where: { userId: user.id }, include: { property: { include: { tenants: { include: { user: { select: { name: true } } } } } } } });
      res.json(tenant?.property ? [tenant.property] : []);
      return;
    }

    // VENDOR / TECH_TEAM — no properties to show
    res.json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

// POST /api/properties - Create new property
export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const { address, city, country, rentAmount, description } = req.body;
    const images = (req as any).files ? (req as any).files.map((file: any) => file.path) : [];

    if (!address || !rentAmount) {
      res.status(400).json({ error: 'Address and rent amount required' });
      return;
    }

    const property = await prisma.property.create({
      data: {
        landlordId: user.id,
        address,
        city: city || 'Accra',
        country: country || 'Ghana',
        rentAmount: parseFloat(rentAmount),
        description,
        // Note: Property model doesn't have images field, so skipping for now
      }
    });

    res.status(201).json({ ...property, images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create property' });
  }
};

// Export upload middleware
export { upload };