import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import tradeRoutes from './routes/trades';
import subscriptionRoutes from './routes/subscriptions';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhooks';
import symbolRoutes from './routes/symbols';
import { errorHandler } from './middleware/error-handler';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Route for Razorpay webhooks (before express.json() if we needed raw body, but Razorpay works with JSON if verification is done on body string)
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/symbols', symbolRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
