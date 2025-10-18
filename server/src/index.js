import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import './lib/db.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: [CLIENT_URL],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Public key endpoint for client
app.get('/api/config/public-key', (req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID || '' });
});

app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);

// Static serve in production (optional)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  // In Docker build we copy the client dist into server/public
  const clientDist = path.join(__dirname, '../public');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
