import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { sendSMS } from './sms';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateReceipt = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      lease: {
        include: {
          tenant: { include: { user: true } },
          property: true
        }
      }
    }
  });

  if (!payment) throw new Error('Payment not found');

  const doc = new PDFDocument();
  const fileName = `receipt_${paymentId}.pdf`;
  const filePath = path.join(__dirname, '../../receipts', fileName);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  // Receipt content
  doc.fontSize(20).text('Fiewura Rent Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Payment ID: ${payment.id}`);
  doc.text(`Amount: GHS ${payment.amount}`);
  doc.text(`Date: ${payment.createdAt.toDateString()}`);
  doc.text(`Property: ${payment.lease.property.address}`);
  doc.text(`Tenant: ${payment.lease.tenant.user.name}`);
  doc.text(`Transaction Ref: ${payment.transactionRef}`);

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => {
      const receiptUrl = `${process.env.BACKEND_URL}/receipts/${fileName}`;
      resolve(receiptUrl);
    });
    stream.on('error', reject);
  });
};

export const sendReceiptSMS = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      lease: {
        include: {
          tenant: { include: { user: true } }
        }
      }
    }
  });

  if (!payment || !payment.receiptUrl) return;

  const message = `Fiewura Receipt: Your rent payment of GHS ${payment.amount} has been received. Download: ${payment.receiptUrl}`;
  const phone = payment.lease.tenant.user.phone;

  if (phone) {
    await sendSMS(phone, message);
  }
};