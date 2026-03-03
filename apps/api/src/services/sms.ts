import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ARKESEL_BASE_URL = 'https://sms.arkesel.com/api/v2/sms/send';

export const sendSMS = async (to: string, content: string): Promise<void> => {
  const apiKey = process.env.ARKESEL_API_KEY;

  if (!apiKey) {
    console.error('Arkesel API key not set');
    return;
  }

  try {
    const response = await axios.post(ARKESEL_BASE_URL, {
      sender: 'Fie Wura',
      message: content,
      recipients: [to]
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Log SMS
    await prisma.smsLog.create({
      data: {
        to,
        message: content,
        status: 'SENT'
      }
    });

    console.log('SMS sent:', response.data);
  } catch (error) {
    // Log failed SMS
    await prisma.smsLog.create({
      data: {
        to,
        message: content,
        status: 'FAILED'
      }
    });
    console.error('Failed to send SMS:', error);
  }
};