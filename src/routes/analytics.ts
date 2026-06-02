import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    // Mock analytics logic based on trades
    const trades = await prisma.trade.findMany({ where: { user_id: userId } });
    
    let totalPnl = 0;
    let winCount = 0;
    
    trades.forEach(t => {
      const netPnl = t.net_pnl ? Number(t.net_pnl) : 0;
      totalPnl += netPnl;
      if (netPnl > 0) winCount++;
    });

    const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;

    res.json({
      data: {
        totalTrades: trades.length,
        winRate,
        netPnl: totalPnl,
        profitFactor: 1.5, // mock
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
});

router.get('/pnl-history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    res.json({
      data: [
        { date: '2023-01-01', pnl: 1000 },
        { date: '2023-01-02', pnl: -500 },
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pnl history' });
  }
});

router.get('/strategy-performance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    res.json({
      data: [
        { strategy: 'Straddle', pnl: 5000, winRate: 60 },
        { strategy: 'Strangle', pnl: -1000, winRate: 40 },
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching strategy performance' });
  }
});

export default router;
