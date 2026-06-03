import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

const getDateFilter = (range?: string) => {
  if (!range || range === 'all') return {};

  const now = new Date();
  let gteDate: Date;

  switch (range) {
    case 'month':
      gteDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '30d':
      gteDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      gteDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      gteDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return {};
  }

  return { gte: gteDate };
};

router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const range = req.query.range as string;
    const dateFilter = getDateFilter(range);

    const trades = await prisma.trade.findMany({ 
      where: { 
        user_id: userId,
        entry_datetime: dateFilter
      } 
    });

    let totalPnl = 0;
    let winCount = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let maxDrawdown = 0;
    let runningPnl = 0;
    let peak = 0;
    let bestDay = 0;
    const dailyPnL: Record<string, number> = {};

    trades.forEach(t => {
      const netPnl = t.net_pnl ? Number(t.net_pnl) : 0;
      totalPnl += netPnl;

      if (netPnl > 0) {
        winCount++;
        totalProfit += netPnl;
      } else if (netPnl < 0) {
        totalLoss += Math.abs(netPnl);
      }

      // Daily best day calculation
      const dateKey = t.entry_datetime.toISOString().split('T')[0];
      dailyPnL[dateKey] = (dailyPnL[dateKey] || 0) + netPnl;

      // Drawdown calculation
      runningPnl += netPnl;
      if (runningPnl > peak) peak = runningPnl;
      const dd = peak - runningPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    Object.values(dailyPnL).forEach(pnl => {
      if (pnl > bestDay) bestDay = pnl;
    });

    const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

    res.json({
      data: {
        totalTrades: trades.length,
        winRate: winRate.toFixed(1) + '%',
        netPnl: totalPnl,
        profitFactor: profitFactor.toFixed(2),
        avgWinner: winCount > 0 ? totalProfit / winCount : 0,
        avgLoser: (trades.length - winCount) > 0 ? totalLoss / (trades.length - winCount) : 0,
        maxDrawdown,
        bestDay
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
    const range = req.query.range as string;
    const dateFilter = getDateFilter(range);

    const trades = await prisma.trade.findMany({
      where: { 
        user_id: userId,
        entry_datetime: dateFilter
      },
      orderBy: { entry_datetime: 'asc' },
      select: { entry_datetime: true, net_pnl: true }
    });

    let runningPnl = 0;
    const history = trades.map(t => {
      runningPnl += Number(t.net_pnl || 0);
      return {
        date: t.entry_datetime.toISOString().split('T')[0],
        profit: runningPnl
      };
    });

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

router.get('/daily-pnl', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const trades = await prisma.trade.findMany({
      where: { user_id: userId },
      select: { entry_datetime: true, net_pnl: true }
    });

    const dailyPnL: Record<string, number> = {};
    trades.forEach(t => {
      const dateKey = t.entry_datetime.toISOString().split('T')[0];
      dailyPnL[dateKey] = (dailyPnL[dateKey] || 0) + Number(t.net_pnl || 0);
    });

    res.json({ data: dailyPnL });
  } catch (error) {
    console.error('Daily PnL error:', error);
    res.status(500).json({ error: 'Error fetching daily pnl' });
  }
});

export default router;
