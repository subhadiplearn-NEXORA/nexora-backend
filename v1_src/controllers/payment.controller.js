const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const User = require('../models/User');

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_CURRENCY = 'INR'
} = process.env;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay Order (server-side) for an existing Order document
 * POST /api/payments/razorpay/create-order
 * body: { orderId }
 * Returns: { razorpayOrderId, amount, currency, keyId }
 */
exports.createRazorpayOrder = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Only allow creating Razorpay order for online payment method
    if (order.paymentMethod !== 'online') {
      return res.status(400).json({ success: false, message: 'Order payment method is not online' });
    }

    // If already paid, do not create
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    // Create razorpay order with amount in paise
    const amountPaise = Math.round(order.totalAmount * 100);

    const options = {
      amount: amountPaise,
      currency: RAZORPAY_CURRENCY,
      receipt: order.orderId || `order_${order._id}`,
      payment_capture: 1, // auto-capture
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save a pending Payment record linking to razorpayOrderId
    const paymentRecord = new Payment({
      orderId: order._id,
      customerId: order.customerId,
      sellerId: order.sellerId,
      amount: order.totalAmount,
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
      status: 'pending',
      commission: order.commission || 0,
      sellerAmount: order.sellerAmount || 0,
    });

    await paymentRecord.save();

    // Link payment record to order for reference (not finalizing payment yet)
    order.paymentId = paymentRecord._id;
    await order.save();

    return res.status(201).json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId: RAZORPAY_KEY_ID,
        paymentRecordId: paymentRecord._id,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Verify Razorpay Payment signature and complete payment
 * POST /api/payments/razorpay/verify
 * body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
exports.verifyRazorpayPayment = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generated_signature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Find Payment record
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    // Update payment record
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'completed';
    payment.transactionId = razorpayPaymentId; // use payment id as transaction id
    await payment.save();

    // Update order paymentStatus to paid
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.paymentId = payment._id;
      await order.save();
    }

    // At this point: payment captured by Razorpay to admin account.
    // Commission calculation is already stored on order; settlement module will use that.
    return res.status(200).json({ success: true, message: 'Payment verified and completed', data: payment });
  } catch (err) {
    next(err);
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Seller confirms COD collection for an order
 * POST /api/payments/cod/confirm
 * body: { orderId }
 *
 * Seller-only: can only confirm COD for orders that belong to their shop.
 * Recommendation: call after marking order as delivered.
 */
exports.confirmCOD = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const userId = req.user.id;
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    const order = await Order.findById(orderId).session(session);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Ensure order paymentMethod is cod
    if (order.paymentMethod !== 'cod') {
      return res.status(400).json({ success: false, message: 'Order is not COD' });
    }

    // Seller ownership check
    const seller = await Seller.findOne({ userId }).session(session);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (order.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to confirm this order' });
    }

    // Optionally require orderStatus === 'delivered' before confirming COD
    // We'll allow confirming only when delivered to ensure cash collected on delivery.
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ success: false, message: 'COD collection should be confirmed after delivery' });
    }

    // Prevent double confirmation
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Payment already recorded for this order' });
    }

    if (session) session.startTransaction();

    // Create Payment record for COD
    const payment = new Payment({
      orderId: order._id,
      customerId: order.customerId,
      sellerId: order.sellerId,
      amount: order.totalAmount,
      paymentMethod: 'cod',
      status: 'completed',
      commission: order.commission || 0,
      sellerAmount: order.sellerAmount || 0,
      transactionId: `COD-${order.orderId}-${Date.now()}`,
    });

    await payment.save({ session });

    // Update order paymentStatus to 'paid' and link payment
    order.paymentStatus = 'paid';
    order.paymentId = payment._id;
    await order.save({ session });

    // Update seller stats: totalEarnings (seller collected), pendingSettlement remains for commission owed to admin
    try {
      const s = await Seller.findById(order.sellerId).session(session);
      if (s && s.statistics) {
        s.statistics.totalEarnings = (s.statistics.totalEarnings || 0) + payment.sellerAmount;
        // pendingEarnings should be decreased if earlier we added pendingEarnings at order creation
        s.statistics.pendingEarnings = Math.max(0, (s.statistics.pendingEarnings || 0) - payment.sellerAmount);
        await s.save({ session });
      }
    } catch (e) {
      console.warn('Failed to update seller statistics after COD confirmation:', e.message || e);
    }

    if (session) await session.commitTransaction();
    if (session) session.endSession();

    return res.status(200).json({ success: true, message: 'COD confirmed and payment recorded', data: payment });
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (e) {}
      session.endSession();
    }
    next(err);
  }
};

/**
 * Get payment by id
 * GET /api/payments/:id
 * Access: admin OR payment owner (seller/customer)
 */
exports.getPayment = async (req, res, next) => {
  try {
    const requester = req.user;
    const id = req.params.id;

    const payment = await Payment.findById(id).populate('orderId', 'orderId orderStatus');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Authorization
    if (requester.role === 'admin') {
      return res.status(200).json({ success: true, data: payment });
    }
    if (requester.role === 'seller' && payment.sellerId.toString() === requester.id) {
      return res.status(200).json({ success: true, data: payment });
    }
    if (requester.role === 'customer' && payment.customerId.toString() === requester.id) {
      return res.status(200).json({ success: true, data: payment });
    }

    return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
  } catch (err) {
    next(err);
  }
};

/**
 * Get payment by order id
 * GET /api/payments/by-order/:orderId
 */
exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const requester = req.user;
    const orderId = req.params.orderId;
    const payment = await Payment.findOne({ orderId }).populate('orderId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Authorization similar to getPayment
    if (requester.role === 'admin') {
      return res.status(200).json({ success: true, data: payment });
    }
    if (requester.role === 'seller') {
      // ensure seller owns
      const seller = await Seller.findOne({ userId: requester.id });
      if (seller && payment.sellerId.toString() === seller._id.toString()) {
        return res.status(200).json({ success: true, data: payment });
      }
    }
    if (requester.role === 'customer' && payment.customerId.toString() === requester.id) {
      return res.status(200).json({ success: true, data: payment });
    }

    return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
  } catch (err) {
    next(err);
  }
};