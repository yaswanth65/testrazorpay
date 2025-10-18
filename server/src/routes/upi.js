import { Router } from 'express';
import Order from '../models/Order.js';

const router = Router();

// Create a UPI intent URI for direct app launch (merchant VPA must be configured in env)
router.post('/intent', async (req, res) => {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) return res.status(400).json({ error: 'Missing' });

    const amount = 1.0; // INR

    const order = await Order.create({
      name,
      mobile,
      product: '₹1 Product',
      amount: 100,
      currency: 'INR',
      status: 'created',
      razorpayOrderId: null,
    });

    const merchantVpa = process.env.MERCHANT_VPA; // e.g. merchant@upi
    if (!merchantVpa) return res.status(500).json({ error: 'Merchant VPA not configured' });

    const params = new URLSearchParams({
      pa: merchantVpa,
      pn: process.env.MERCHANT_NAME || 'Merchant',
      tr: String(order._id),
      am: amount.toFixed(2),
      cu: 'INR',
      tn: '₹1 Product',
    });

    const upiUri = `upi://pay?${params.toString()}`;
    const phonepeUri = `phonepe://upi/transfer?${params.toString()}`; // best-effort

    res.json({ upiUri, phonepeUri, orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create UPI intent' });
  }
});

// Confirm UPI payment by transaction id provided by user (manual step)
router.post('/confirm', async (req, res) => {
  try {
    const { orderId, txnId } = req.body;
    if (!orderId || !txnId) return res.status(400).json({ error: 'Missing' });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'paid';
    order.upiTransactionId = txnId;
    order.paidAt = new Date();
    await order.save();
    res.json({ ok: true, id: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Confirm failed' });
  }
});

// Get order by id
router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

export default router;
