import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db';

const router = Router();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

router.post('/razorpay', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const body = JSON.stringify(req.body);

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('Invalid Razorpay signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { event, payload } = req.body;

  try {
    switch (event) {
      case 'subscription.activated': {
        const rzpSubscription = payload.subscription.entity;
        await prisma.subscription.update({
          where: { razorpay_subscription_id: rzpSubscription.id },
          data: {
            status: 'active',
            current_period_end: new Date(rzpSubscription.current_end * 1000),
          },
        });
        console.log(`Subscription activated: ${rzpSubscription.id}`);
        break;
      }

      case 'subscription.charged': {
        const rzpSubscription = payload.subscription.entity;
        await prisma.subscription.update({
          where: { razorpay_subscription_id: rzpSubscription.id },
          data: {
            status: 'active',
            current_period_end: new Date(rzpSubscription.current_end * 1000),
          },
        });
        console.log(`Subscription charged/renewed: ${rzpSubscription.id}`);
        break;
      }

      case 'subscription.cancelled': {
        const rzpSubscription = payload.subscription.entity;
        await prisma.subscription.update({
          where: { razorpay_subscription_id: rzpSubscription.id },
          data: { status: 'cancelled' },
        });
        console.log(`Subscription cancelled: ${rzpSubscription.id}`);
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        console.error(`Payment failed for ${payment.email}: ${payment.error_description}`);
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
