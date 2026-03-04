import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

interface AnalyticsData {
  totalProperties: number;
  totalTenants: number;
  occupancyRate: number;
  rentCollectedThisMonth: number;
  overdueRentCount: number;
  pendingMaintenanceCount: number;
}

interface RevenueData {
  monthlyRevenue: { month: string; revenue: number }[];
  totalRevenue: number;
  paidPayments: number;
}

// Note: Caching can be added later with Redis for performance on large datasets
export const getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const role = user.role;

    // For non-LANDLORD roles, return scoped analytics
    if (role === 'TENANT') {
      const tenant = await prisma.tenant.findFirst({ where: { userId }, include: { property: true, lease: true } });
      const data: AnalyticsData = {
        totalProperties: tenant ? 1 : 0,
        totalTenants: 0,
        occupancyRate: 0,
        rentCollectedThisMonth: 0,
        overdueRentCount: tenant?.lease ? await prisma.payment.count({ where: { leaseId: tenant.lease.id, status: 'PENDING', dueDate: { lt: new Date() } } }) : 0,
        pendingMaintenanceCount: tenant ? await prisma.maintenance.count({ where: { tenantId: tenant.id, status: 'PENDING' } }) : 0,
      };
      res.json(data);
      return;
    }

    if (role === 'VENDOR' || role === 'TECH_TEAM') {
      const assignmentCount = await prisma.maintenanceAssignment.count({ where: { vendorId: userId } });
      const pendingJobs = await prisma.maintenanceAssignment.count({ where: { vendorId: userId, status: { in: ['ASSIGNED', 'PENDING', 'SCHEDULED'] } } });
      const data: AnalyticsData = {
        totalProperties: 0,
        totalTenants: 0,
        occupancyRate: 0,
        rentCollectedThisMonth: 0,
        overdueRentCount: 0,
        pendingMaintenanceCount: pendingJobs,
      };
      res.json(data);
      return;
    }

    // LANDLORD flow below
    // Total properties
    const totalProperties = await prisma.property.count({ where: { landlordId: userId } });

    // Total tenants: Tenants with active lease
    const totalTenants = await prisma.tenant.count({
      where: {
        property: { landlordId: userId },
        lease: { status: 'ACTIVE' }
      }
    });

    // Occupancy rate: Total tenants / total properties (assuming 1 tenant per property)
    const occupancyRate = totalProperties > 0 ? (totalTenants / totalProperties) * 100 : 0;

    // Rent collected this month: Sum of COMPLETED payments created this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const rentCollectedThisMonthResult = await prisma.payment.aggregate({
      where: {
        lease: {
          property: { landlordId: userId }
        },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });
    const rentCollectedThisMonth = rentCollectedThisMonthResult._sum.amount || 0;

    // Overdue rent count: Count of PENDING payments with dueDate < now
    const overdueRentCount = await prisma.payment.count({
      where: {
        lease: {
          property: { landlordId: userId }
        },
        status: 'PENDING',
        dueDate: { lt: now }
      }
    });

    // Pending maintenance count: Count of maintenance with status PENDING
    const pendingMaintenanceCount = await prisma.maintenance.count({
      where: {
        property: { landlordId: userId },
        status: 'PENDING'
      }
    });

    const data: AnalyticsData = {
      totalProperties,
      totalTenants,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      rentCollectedThisMonth,
      overdueRentCount,
      pendingMaintenanceCount
    };

    // Broadcast via Socket.io
    const io = (req as any).io;
    if (io) {
      io.emit('analytics-update', data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

export const getRevenueAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user.id;

    // Monthly revenue for last 12 months
    const monthlyRevenue = await prisma.$queryRaw<{ month: string; revenue: number }[]>`
      SELECT
        TO_CHAR(p."createdAt", 'YYYY-MM') as month,
        SUM(p.amount) as revenue
      FROM "Payment" p
      JOIN "Lease" l ON p."leaseId" = l.id
      JOIN "Property" prop ON l."propertyId" = prop.id
      WHERE prop."landlordId" = ${userId}
        AND p.status = 'COMPLETED'
        AND p."createdAt" >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(p."createdAt", 'YYYY-MM')
      ORDER BY month
    `;

    // Total revenue
    const totalRevenueResult = await prisma.payment.aggregate({
      where: {
        lease: { property: { landlordId: userId } },
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    const totalRevenue = totalRevenueResult._sum.amount || 0;

    // Total paid payments count
    const paidPayments = await prisma.payment.count({
      where: {
        lease: { property: { landlordId: userId } },
        status: 'COMPLETED'
      }
    });

    const data: RevenueData = {
      monthlyRevenue: monthlyRevenue.map(r => ({ month: r.month, revenue: Number(r.revenue) })),
      totalRevenue,
      paidPayments
    };

    res.json(data);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

export const exportAnalyticsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    // Fetch overview and revenue data
    const overviewRes = await fetch(`${req.protocol}://${req.get('host')}/api/analytics/overview`, {
      headers: { Authorization: req.headers.authorization! }
    });
    const overview = await overviewRes.json();

    const revenueRes = await fetch(`${req.protocol}://${req.get('host')}/api/analytics/revenue`, {
      headers: { Authorization: req.headers.authorization! }
    });
    const revenue = await revenueRes.json();

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.pdf"');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Fie Wura Analytics Report', { align: 'center' });
    doc.moveDown();

    // Overview
    doc.fontSize(16).text('Overview');
    doc.fontSize(12).text(`Total Properties: ${overview.totalProperties}`);
    doc.text(`Occupancy Rate: ${overview.occupancyRate}%`);
    doc.text(`Total Tenants: ${overview.totalTenants}`);
    doc.text(`Rent Collected This Month: GHS ${overview.rentCollectedThisMonth}`);
    doc.text(`Overdue Rent Count: ${overview.overdueRentCount}`);
    doc.text(`Pending Maintenance: ${overview.pendingMaintenanceCount}`);
    doc.moveDown();

    // Revenue
    doc.fontSize(16).text('Revenue Analytics');
    doc.fontSize(12).text(`Total Revenue: GHS ${revenue.totalRevenue.toFixed(2)}`);
    doc.text(`Paid Payments: ${revenue.paidPayments}`);
    doc.moveDown();

    // Monthly Revenue
    doc.fontSize(14).text('Monthly Revenue (Last 12 Months)');
    revenue.monthlyRevenue.forEach(month => {
      doc.fontSize(12).text(`${month.month}: GHS ${month.revenue.toFixed(2)}`);
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};