import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { initializePayment, verifyPayment as verifyPaystackPayment } from '../services/paystack';
import { generateReceipt, sendReceiptSMS } from '../services/receipt';

const prisma = new PrismaClient();

export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { paymentId } = req.body; // Existing payment ID to pay

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

    if (!payment || payment.lease.tenant.userId !== user.id) {
      res.status(403).json({ error: 'Payment not found or access denied' });
      return;
    }

    const metadata = { paymentId };
    const paystackResponse = await initializePayment(user.email, payment.amount, metadata);

    // Update payment with transaction ref
    await prisma.payment.update({
      where: { id: paymentId },
      data: { transactionRef: paystackResponse.reference }
    });

    res.json({ authorization_url: paystackResponse.authorization_url, reference: paystackResponse.reference });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify webhook signature
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const signature = req.headers['x-paystack-signature'] as string;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

    if (hash !== signature) {
      res.status(400).send('Invalid signature');
      return;
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const paymentId = metadata.paymentId;

      // Verify payment
      const verification = await verifyPaystackPayment(reference);

      if (verification.status) {
        // Update payment status
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'COMPLETED' }
        });

        // Generate receipt
        const receiptUrl = await generateReceipt(paymentId);
        await prisma.payment.update({
          where: { id: paymentId },
          data: { receiptUrl }
        });

        // Send SMS receipt
        await sendReceiptSMS(paymentId);

        // Emit Socket.io event
        const io = (req as any).io;
        if (io) {
          io.emit('payment-completed', { paymentId, receiptUrl });
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
};

export const getReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { receiptUrl: true, lease: { select: { tenant: { select: { userId: true } } } } } }
    });

    if (!payment || payment.lease.tenant.userId !== (req as any).user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ receiptUrl: payment.receiptUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get receipt' });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reference, paymentId } = req.body;

    // Find payment
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

    if (!payment || payment.lease.tenant.userId !== user.id) {
      res.status(403).json({ error: 'Payment not found or access denied' });
      return;
    }

    // Verify with Paystack
    const verification = await verifyPaystackPayment(reference);

    if (verification.status && verification.data.status === 'success') {
      // Update payment status
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' }
      });

      // Generate receipt
      const receiptUrl = await generateReceipt(paymentId);
      await prisma.payment.update({
        where: { id: paymentId },
        data: { receiptUrl }
      });

      // Send SMS receipt
      await sendReceiptSMS(paymentId);

      // Emit Socket.io event
      const io = (req as any).io;
      if (io) {
        io.emit('payment-completed', { paymentId, receiptUrl });
      }

      res.json({ message: 'Payment verified successfully', receiptUrl });
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

export const getPendingPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const pendingPayments = await prisma.payment.findMany({
      where: {
        lease: {
          tenant: { userId: user.id }
        },
        status: 'PENDING'
      },
      include: {
        lease: {
          include: {
            property: { select: { address: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(pendingPayments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
};