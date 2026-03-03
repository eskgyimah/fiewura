import Paystack from 'paystack-api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

export const initializePayment = async (email: string, amount: number, metadata: any) => {
  try {
    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100, // Paystack expects kobo (GHS * 100)
      callback_url: `${process.env.FRONTEND_URL}/payment/success`,
      metadata
    });
    return response.data;
  } catch (error) {
    console.error('Paystack init error:', error);
    throw error;
  }
};

export const verifyPayment = async (reference: string) => {
  try {
    const response = await paystack.transaction.verify(reference);
    return response.data;
  } catch (error) {
    console.error('Paystack verify error:', error);
    throw error;
  }
};