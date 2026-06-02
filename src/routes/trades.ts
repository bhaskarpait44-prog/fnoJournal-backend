import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const trades = await prisma.trade.findMany({
      where: { user_id: userId },
      orderBy: { entry_datetime: 'desc' },
    });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching trades' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const tradeData = req.body;
    
    const trade = await prisma.trade.create({
      data: {
        ...tradeData,
        user_id: userId,
      },
    });
    res.status(201).json(trade);
  } catch (error) {
    res.status(500).json({ error: 'Error creating trade' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData = req.body;

    const result = await prisma.trade.updateMany({
      where: { id: id as string, user_id: userId },
      data: updateData,
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Trade not found or unauthorized' });
    }

    const trade = await prisma.trade.findUnique({ where: { id: id as string } });
    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: 'Error updating trade' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await prisma.trade.deleteMany({
      where: { id: id as string, user_id: userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Trade not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting trade' });
  }
});

export default router;
