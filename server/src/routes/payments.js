import { Router } from 'express';
import Order from '../models/Order.js';
import { verifyPaymentSignature } from '../lib/razorpay.js';

const router = Router();

// Desktop inline: verify signature from client after success
router.post('/verify', async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const valid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) return res.status(400).json({ error: 'Invalid signature' });

    // Resolve order by given orderId or razorpay_order_id
    let orderDoc = null;
    if (orderId) {
      orderDoc = await Order.findById(orderId);
    }
    if (!orderDoc) {
      orderDoc = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    }
    if (!orderDoc) return res.status(404).json({ error: 'Order not found' });

    const order = await Order.findByIdAndUpdate(
      orderDoc._id,
      {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, id: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Mobile redirect callback (e.g., UPI intent/PhonePe) - Razorpay redirects here with params
router.post('/callback', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing callback details' });
    }

    const valid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) return res.status(400).json({ error: 'Invalid signature' });

    // Attempt to get orderId from notes if present, else lookup by razorpay_order_id
    let { orderId } = req.body;
    if (!orderId && req.body.notes) {
      try { orderId = JSON.parse(req.body.notes).orderId; } catch {}
    }
    let orderDoc = null;
    if (orderId) orderDoc = await Order.findById(orderId);
    if (!orderDoc) orderDoc = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!orderDoc) return res.status(404).json({ error: 'Order not found' });

    const order = await Order.findByIdAndUpdate(
      orderDoc._id,
      {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    // Redirect to client status page
    res.redirect(303, `${clientUrl}/status/${order._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

export default router;
