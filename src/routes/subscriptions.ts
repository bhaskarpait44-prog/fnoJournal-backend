import { Router } from 'express';
import Razorpay from 'razorpay';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
});

router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: userId },
    });
    res.json({ subscription });
  } catch (error) {
    console.error('Fetch subscription status error:', error);
    res.status(500).json({ error: 'Error fetching subscription' });
  }
});

router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { plan_id } = req.body;

    const planMap: Record<string, string> = {
      'monthly': process.env.RAZORPAY_PLAN_MONTHLY || 'plan_mock_monthly',
      'quarterly': process.env.RAZORPAY_PLAN_QUARTERLY || 'plan_mock_quarterly',
      'annual': process.env.RAZORPAY_PLAN_ANNUAL || 'plan_mock_annual',
    };

    const rzpPlanId = planMap[plan_id];
    if (!rzpPlanId) return res.status(400).json({ error: 'Invalid plan selected' });

    const rzpSubscription = await razorpay.subscriptions.create({
      plan_id: rzpPlanId,
      customer_notify: 1,
      total_count: plan_id === 'annual' ? 1 : plan_id === 'quarterly' ? 4 : 12,
    });

    const subscription = await prisma.subscription.upsert({
      where: { user_id: userId },
      update: { 
        plan_id, 
        status: 'created', 
        razorpay_subscription_id: rzpSubscription.id 
      },
      create: { 
        user_id: userId, 
        plan_id, 
        status: 'created', 
        razorpay_subscription_id: rzpSubscription.id 
      },
    });
    
    res.json({ subscription });
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Error creating subscription' });
  }
});

router.post('/cancel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: userId },
    });

    if (!subscription || !subscription.razorpay_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id);

    await prisma.subscription.update({
      where: { user_id: userId },
      data: { status: 'cancelled' },
    });

    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Error cancelling subscription' });
  }
});

export default router;
