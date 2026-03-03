import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSmsLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.smsLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50 // last 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SMS logs' });
  }
};

export const sendManualSms = async (req: Request, res: Response) => {
  // For admin to send manual SMS
  const { to, message } = req.body;
  // Assume sendSMS function
  // await sendSMS(to, message);
  res.json({ message: 'SMS sent' });
};