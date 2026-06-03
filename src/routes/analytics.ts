import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const trades = await prisma.trade.findMany({ 
      where: { user_id: userId } 
    });
    
    let totalPnl = 0;
    let winCount = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    
    trades.forEach(t => {
      const netPnl = t.net_pnl ? Number(t.net_pnl) : 0;
      totalPnl += netPnl;
      if (netPnl > 0) {
        winCount++;
        totalProfit += netPnl;
      } else if (netPnl < 0) {
        totalLoss += Math.abs(netPnl);
      }
    });

    const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

    res.json({
      data: {
        totalTrades: trades.length,
        winRate: winRate.toFixed(1) + '%',
        netPnl: totalPnl,
        profitFactor: profitFactor.toFixed(2),
      }
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Error fetching analytics' });
  }
});

router.get('/pnl-history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const trades = await prisma.trade.findMany({
      where: { user_id: userId },
      orderBy: { entry_datetime: 'asc' },
      select: { entry_datetime: true, net_pnl: true }
    });

    const history = trades.map(t => ({
      date: t.entry_datetime.toISOString().split('T')[0],
      pnl: Number(t.net_pnl || 0)
    }));

    res.json({ data: history });
  } catch (error) {
    console.error('PnL history error:', error);
    res.status(500).json({ error: 'Error fetching pnl history' });
  }
});

router.get('/strategy-performance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const trades = await prisma.trade.findMany({
      where: { user_id: userId },
      select: { strategy_tag: true, net_pnl: true }
    });

    const performance: Record<string, { pnl: number, wins: number, total: number }> = {};

    trades.forEach(t => {
      const tag = t.strategy_tag || 'Uncategorized';
      const pnl = Number(t.net_pnl || 0);
      
      if (!performance[tag]) {
        performance[tag] = { pnl: 0, wins: 0, total: 0 };
      }
      
      performance[tag].pnl += pnl;
      performance[tag].total += 1;
      if (pnl > 0) performance[tag].wins += 1;
    });

    const result = Object.entries(performance).map(([strategy, stats]) => ({
      strategy,
      pnl: stats.pnl,
      winRate: ((stats.wins / stats.total) * 100).toFixed(1)
    }));

    res.json({ data: result });
  } catch (error) {
    console.error('Strategy performance error:', error);
    res.status(500).json({ error: 'Error fetching strategy performance' });
  }
});

export default router;
