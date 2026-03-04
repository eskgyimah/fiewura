import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

// POST /api/agreements - Landlord creates an agreement for a lease
export const createAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { leaseId, templateType, terms } = req.body;

    if (!leaseId) {
      res.status(400).json({ error: 'leaseId is required' });
      return;
    }

    // Verify lease exists and belongs to landlord's property
    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        property: { landlordId: user.id },
      },
      include: { property: true, tenant: { include: { user: true } } },
    });

    if (!lease) {
      res.status(404).json({ error: 'Lease not found or access denied' });
      return;
    }

    // Check if agreement already exists for this lease
    const existing = await prisma.tenancyAgreement.findUnique({
      where: { leaseId },
    });

    if (existing) {
      res.status(409).json({ error: 'Agreement already exists for this lease' });
      return;
    }

    const agreement = await prisma.tenancyAgreement.create({
      data: {
        leaseId,
        templateType: templateType || 'standard',
        terms: terms || {},
        status: 'PENDING_SIGNATURES',
      },
    });

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('agreement-created', { leaseId, agreementId: agreement.id });
    }

    res.status(201).json(agreement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create agreement' });
  }
};

// GET /api/agreements/:id - View agreement details
export const getAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agreement = await prisma.tenancyAgreement.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: { select: { address: true, city: true, rentAmount: true, landlordId: true } },
            tenant: { include: { user: { select: { name: true, phone: true, email: true } } } },
          },
        },
      },
    });

    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }

    res.json(agreement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch agreement' });
  }
};

// POST /api/agreements/:id/sign - Landlord or tenant signs the agreement
export const signAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const agreement = await prisma.tenancyAgreement.findUnique({
      where: { id },
      include: {
        lease: { include: { property: true, tenant: true } },
      },
    });

    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }

    // Determine which field to set based on role
    let updateData: any = {};

    if (user.role === 'LANDLORD') {
      // Verify landlord owns the property
      if (agreement.lease.property.landlordId !== user.id) {
        res.status(403).json({ error: 'Access denied. Not your property.' });
        return;
      }
      if (agreement.landlordSigned) {
        res.status(400).json({ error: 'Landlord has already signed' });
        return;
      }
      updateData.landlordSigned = true;
      updateData.landlordSignedAt = new Date();
    } else if (user.role === 'TENANT') {
      // Verify tenant is on this lease
      if (agreement.lease.tenant.userId !== user.id) {
        res.status(403).json({ error: 'Access denied. Not your lease.' });
        return;
      }
      if (agreement.tenantSigned) {
        res.status(400).json({ error: 'Tenant has already signed' });
        return;
      }
      updateData.tenantSigned = true;
      updateData.tenantSignedAt = new Date();
    } else {
      res.status(403).json({ error: 'Only landlord or tenant can sign' });
      return;
    }

    // Check if both will be signed after this update
    const willBothSigned =
      (updateData.landlordSigned || agreement.landlordSigned) &&
      (updateData.tenantSigned || agreement.tenantSigned);

    if (willBothSigned) {
      updateData.status = 'ACTIVE';
    }

    const updated = await prisma.tenancyAgreement.update({
      where: { id },
      data: updateData,
    });

    // Emit Socket.io event
    const io = (req as any).io;
    if (io) {
      io.emit('agreement-signed', {
        agreementId: id,
        signedBy: user.role,
        bothSigned: willBothSigned,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to sign agreement' });
  }
};

// GET /api/agreements/:id/pdf - Generate PDF of agreement
export const getAgreementPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agreement = await prisma.tenancyAgreement.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: { include: { landlord: { select: { name: true, email: true, phone: true } } } },
            tenant: { include: { user: { select: { name: true, email: true, phone: true } } } },
          },
        },
      },
    });

    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }

    const terms = (agreement.terms as any) || {};
    const lease = agreement.lease;
    const property = lease.property;
    const landlord = property.landlord;
    const tenant = lease.tenant.user;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=agreement-${id}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('TENANCY AGREEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Template: ${agreement.templateType}`, { align: 'center' });
    doc.moveDown(2);

    // Parties
    doc.fontSize(14).text('PARTIES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Landlord: ${landlord.name}`);
    doc.text(`Email: ${landlord.email}${landlord.phone ? ` | Phone: ${landlord.phone}` : ''}`);
    doc.moveDown(0.5);
    doc.text(`Tenant: ${tenant.name}`);
    doc.text(`Email: ${tenant.email}${tenant.phone ? ` | Phone: ${tenant.phone}` : ''}`);
    doc.moveDown();

    // Property
    doc.fontSize(14).text('PROPERTY', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Address: ${property.address}, ${property.city}, ${property.country}`);
    doc.text(`Monthly Rent: GHS ${lease.rentAmount.toFixed(2)}`);
    doc.moveDown();

    // Lease Period
    doc.fontSize(14).text('LEASE PERIOD', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Start Date: ${lease.startDate.toDateString()}`);
    doc.text(`End Date: ${lease.endDate.toDateString()}`);
    doc.moveDown();

    // Terms
    if (terms && Object.keys(terms).length > 0) {
      doc.fontSize(14).text('TERMS AND CONDITIONS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);

      let termIndex = 1;
      for (const [key, value] of Object.entries(terms)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        doc.text(`${termIndex}. ${label}: ${value}`);
        doc.moveDown(0.3);
        termIndex++;
      }
      doc.moveDown();
    }

    // Signatures
    doc.fontSize(14).text('SIGNATURES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);

    doc.text(`Landlord Signed: ${agreement.landlordSigned ? 'Yes' : 'No'}${agreement.landlordSignedAt ? ` (${agreement.landlordSignedAt.toDateString()})` : ''}`);
    doc.text(`Tenant Signed: ${agreement.tenantSigned ? 'Yes' : 'No'}${agreement.tenantSignedAt ? ` (${agreement.tenantSignedAt.toDateString()})` : ''}`);
    doc.moveDown();

    doc.text(`Status: ${agreement.status}`, { align: 'center' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(9).text('Generated by Fie Wura - Digital Tenancy Management', { align: 'center' });
    doc.text(`Date: ${new Date().toDateString()}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate agreement PDF' });
  }
};
