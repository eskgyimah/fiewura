import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const suggestVendors = async (specialty: string, location?: string) => {
  const where: any = {
    specialties: { has: specialty }
  };

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: { rating: 'desc' },
    take: 5 // top 5
  });

  return vendors;
};