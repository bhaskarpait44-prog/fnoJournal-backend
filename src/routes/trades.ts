import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { tradeSchema } from '../validations';

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

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const trade = await prisma.trade.findUnique({
      where: { id: id as string, user_id: userId },
    });

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching trade' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = tradeSchema.parse(req.body);
    
    const {
      underlying,
      instrument_type,
      strike_price,
      expiry_date,
      action,
      entry_datetime,
      exit_datetime,
      entry_price,
      exit_price,
      lots,
      lot_size,
      brokerage,
      stt,
      exchange_charges,
      gst,
      sebi_charges,
      strategy_tag,
      notes,
    } = validatedData;

    // Calculate P&L on backend
    const gross_pnl = action === 'BUY'
      ? (exit_price - entry_price) * lots * lot_size
      : (entry_price - exit_price) * lots * lot_size;
    
    const total_charges = Number(brokerage || 0) + Number(stt || 0) + Number(exchange_charges || 0) + Number(gst || 0) + Number(sebi_charges || 0);
    const net_pnl = gross_pnl - total_charges;
    
    const trade = await prisma.trade.create({
      data: {
        user_id: userId,
        underlying,
        instrument_type,
        strike_price,
        expiry_date: new Date(expiry_date),
        action,
        entry_datetime: new Date(entry_datetime),
        exit_datetime: new Date(exit_datetime),
        entry_price,
        exit_price,
        lots,
        lot_size,
        brokerage,
        stt,
        exchange_charges,
        gst,
        sebi_charges,
        gross_pnl,
        net_pnl,
        strategy_tag,
        notes,
      },
    });
    res.status(201).json(trade);
  } catch (error) {
    console.error('Trade creation error:', error);
    res.status(500).json({ error: 'Error creating trade' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    // For simplicity, we fetch the existing trade first if we need to recalculate P&L
    // Or we just allow updating fields and trust the frontend to send a full set if P&L needs updating,
    // but here we whitelist and recalculate to be safe.
    
    const existingTrade = await prisma.trade.findUnique({
      where: { id: id as string, user_id: userId }
    });

    if (!existingTrade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const validatedData = tradeSchema.partial().parse(req.body);

    const {
      underlying, instrument_type, strike_price, expiry_date, action,
      entry_datetime, exit_datetime, entry_price, exit_price, lots,
      lot_size, brokerage, stt, exchange_charges, gst, sebi_charges,
      strategy_tag, notes
    } = validatedData;

    // Merge with existing data for calculation
    const calcAction = action || existingTrade.action;
    const calcEntry = entry_price !== undefined ? entry_price : Number(existingTrade.entry_price);
    const calcExit = exit_price !== undefined ? exit_price : Number(existingTrade.exit_price);
    const calcLots = lots !== undefined ? lots : existingTrade.lots;
    const calcLotSize = lot_size !== undefined ? lot_size : existingTrade.lot_size;

    const gross_pnl = calcAction === 'BUY'
      ? (calcExit - calcEntry) * calcLots * calcLotSize
      : (calcEntry - calcExit) * calcLots * calcLotSize;

    const total_charges = 
      Number(brokerage !== undefined ? brokerage : existingTrade.brokerage) +
      Number(stt !== undefined ? stt : existingTrade.stt) +
      Number(exchange_charges !== undefined ? exchange_charges : existingTrade.exchange_charges) +
      Number(gst !== undefined ? gst : existingTrade.gst) +
      Number(sebi_charges !== undefined ? sebi_charges : existingTrade.sebi_charges);

    const net_pnl = gross_pnl - total_charges;

    const trade = await prisma.trade.update({
      where: { id: id as string },
      data: {
        underlying,
        instrument_type,
        strike_price,
        expiry_date: expiry_date ? new Date(expiry_date) : undefined,
        action,
        entry_datetime: entry_datetime ? new Date(entry_datetime) : undefined,
        exit_datetime: exit_datetime ? new Date(exit_datetime) : undefined,
        entry_price,
        exit_price,
        lots,
        lot_size,
        brokerage,
        stt,
        exchange_charges,
        gst,
        sebi_charges,
        gross_pnl,
        net_pnl,
        strategy_tag,
        notes,
      },
    });

    res.json(trade);
  } catch (error) {
    console.error('Trade update error:', error);
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
