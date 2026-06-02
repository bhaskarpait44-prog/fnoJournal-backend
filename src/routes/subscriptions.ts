import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: userId },
    });
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching subscription' });
  }
});

// Mock create endpoint, you can adapt to Razorpay integration
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { plan_id } = req.body;

    const subscription = await prisma.subscription.upsert({
      where: { user_id: userId },
      update: { plan_id, status: 'active', current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      create: { user_id: userId, plan_id, status: 'active', current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: 'Error creating subscription' });
  }
});

export default router;
