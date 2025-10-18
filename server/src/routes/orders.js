import { Router } from 'express';
import Order from '../models/Order.js';
import { razorpay } from '../lib/razorpay.js';

const router = Router();

// Create order and Razorpay order
router.post('/init', async (req, res) => {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required' });
    }

    // Fixed ₹1 product
    const amount = 100; // paise
    const currency = 'INR';

    const razorOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt: `rcpt_${Date.now()}`,
    });

    const order = await Order.create({
      name,
      mobile,
      product: '₹1 Product',
      amount,
      currency,
      status: 'created',
      razorpayOrderId: razorOrder.id,
    });

    res.json({
      orderId: order._id,
      razorpayOrderId: razorOrder.id,
      amount,
      currency,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initialize order' });
  }
});

// List paid orders (descending by time)
router.get('/', async (req, res) => {
  const orders = await Order.find({ status: 'paid' }).sort({ createdAt: -1 }).lean();
  res.json(orders);
});

// Get order by id
router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

export default router;
