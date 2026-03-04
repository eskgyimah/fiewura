import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TIER_LEVEL: Record<string, number> = {
  FREE: 0,
  BASIC: 1,
  PREMIUM: 2,
};

// GET /subscriptions/current
export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Resolve landlord ID: if LANDLORD, use own id; otherwise find via tenant lease
    let landlordId: string | null = null;

    if (user.role === 'LANDLORD') {
      landlordId = user.id;
    } else if (user.role === 'TENANT') {
      const lease = await prisma.lease.findFirst({
        where: { tenant: { userId: user.id }, status: 'ACTIVE' },
        include: { property: { select: { landlordId: true } } },
      });
      landlordId = lease?.property.landlordId ?? null;
    }

    if (!landlordId) {
      res.status(404).json({ error: 'No associated landlord found' });
      return;
    }

    // Return existing subscription or create FREE tier
    let subscription = await prisma.subscription.findUnique({
      where: { landlordId },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          landlordId,
          tier: 'FREE',
          status: 'ACTIVE',
        },
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// POST /subscriptions/create
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tier, paymentChannel } = req.body;

    if (!tier || !['FREE', 'BASIC', 'PREMIUM'].includes(tier)) {
      res.status(400).json({ error: 'Invalid tier. Must be FREE, BASIC, or PREMIUM.' });
      return;
    }

    // Check for existing subscription
    const existing = await prisma.subscription.findUnique({
      where: { landlordId: user.id },
    });

    if (existing) {
      res.status(409).json({ error: 'Subscription already exists. Use upgrade endpoint instead.' });
      return;
    }

    if (tier === 'FREE') {
      const subscription = await prisma.subscription.create({
        data: {
          landlordId: user.id,
          tier: 'FREE',
          status: 'ACTIVE',
        },
      });
      res.status(201).json(subscription);
      return;
    }

    // TODO: Integrate Paystack subscription plan creation
    // 1. Call Paystack API to create a subscription plan for the chosen tier
    // 2. Use paymentChannel to determine payment method
    // 3. Store paystackSubCode and paystackCustomerCode from response
    // 4. Set renewalDate based on plan interval
    // For now, create the record directly with the requested tier

    const subscription = await prisma.subscription.create({
      data: {
        landlordId: user.id,
        tier,
        status: 'ACTIVE',
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// PUT /subscriptions/upgrade
export const upgradeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { tier } = req.body;

    if (!tier || !['FREE', 'BASIC', 'PREMIUM'].includes(tier)) {
      res.status(400).json({ error: 'Invalid tier. Must be FREE, BASIC, or PREMIUM.' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { landlordId: user.id },
    });

    if (!subscription) {
      res.status(404).json({ error: 'No subscription found. Create one first.' });
      return;
    }

    if (subscription.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot upgrade a cancelled subscription. Create a new one.' });
      return;
    }

    const currentLevel = TIER_LEVEL[subscription.tier] ?? 0;
    const requestedLevel = TIER_LEVEL[tier] ?? 0;

    if (requestedLevel <= currentLevel) {
      res.status(400).json({ error: 'New tier must be higher than current tier.' });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { landlordId: user.id },
      data: {
        tier,
        renewalDate: tier === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
};

// POST /subscriptions/cancel
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { landlordId: user.id },
    });

    if (!subscription) {
      res.status(404).json({ error: 'No subscription found.' });
      return;
    }

    if (subscription.status === 'CANCELLED') {
      res.status(400).json({ error: 'Subscription is already cancelled.' });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { landlordId: user.id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// Middleware: require a minimum subscription tier
export const requireTier = (minTier: 'FREE' | 'BASIC' | 'PREMIUM') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Non-LANDLORD roles bypass tier check (they access through their landlord's subscription)
      if (user.role !== 'LANDLORD') {
        // Resolve landlord through tenant's active lease
        if (user.role === 'TENANT') {
          const lease = await prisma.lease.findFirst({
            where: { tenant: { userId: user.id }, status: 'ACTIVE' },
            include: { property: { select: { landlordId: true } } },
          });

          if (!lease) {
            res.status(403).json({ error: 'No active lease found.' });
            return;
          }

          const subscription = await prisma.subscription.findUnique({
            where: { landlordId: lease.property.landlordId },
          });

          const currentLevel = TIER_LEVEL[subscription?.tier ?? 'FREE'] ?? 0;
          const requiredLevel = TIER_LEVEL[minTier];

          if (currentLevel < requiredLevel) {
            res.status(403).json({
              error: `This feature requires a ${minTier} subscription or higher.`,
              currentTier: subscription?.tier ?? 'FREE',
              requiredTier: minTier,
            });
            return;
          }

          next();
          return;
        }

        // VENDOR and other non-LANDLORD roles: pass through
        next();
        return;
      }

      // LANDLORD: check their own subscription
      const subscription = await prisma.subscription.findUnique({
        where: { landlordId: user.id },
      });

      const currentLevel = TIER_LEVEL[subscription?.tier ?? 'FREE'] ?? 0;
      const requiredLevel = TIER_LEVEL[minTier];

      if (currentLevel < requiredLevel) {
        res.status(403).json({
          error: `This feature requires a ${minTier} subscription or higher.`,
          currentTier: subscription?.tier ?? 'FREE',
          requiredTier: minTier,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to verify subscription tier' });
    }
  };
};
