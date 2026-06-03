import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const tradeSchema = z.object({
  underlying: z.enum(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'STOCK']),
  instrument_type: z.enum(['CE', 'PE', 'FUT']),
  strike_price: z.number().optional().nullable(),
  expiry_date: z.string().or(z.date()),
  action: z.enum(['BUY', 'SELL']),
  entry_datetime: z.string().or(z.date()),
  exit_datetime: z.string().or(z.date()),
  entry_price: z.number().positive(),
  exit_price: z.number().positive(),
  lots: z.number().int().positive(),
  lot_size: z.number().int().positive(),
  brokerage: z.number().optional().default(0),
  stt: z.number().optional().default(0),
  exchange_charges: z.number().optional().default(0),
  gst: z.number().optional().default(0),
  sebi_charges: z.number().optional().default(0),
  strategy_tag: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatar_url: z.string().url().optional().nullable(),
});
