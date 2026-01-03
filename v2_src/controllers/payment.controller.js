/**
 * src/controllers/payment.controller.js
 * Razorpay integration and COD handling
 */
const RazorpayService = require('../services/razorpay.service');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const mongoose = require('mongoose');

exports.createRazorpayOrder = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.paymentMethod !== 'online') return res.status(400).json({ success: false, message: 'Order is not online payment' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ success: false, message: 'Order already paid' });

    const amount = order.totalAmount;
    const receipt = order.orderId || `order_${order._id}`;

    const razorpayOrder = await RazorpayService.createOrder({ amount, receipt });

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
    order.paymentId = paymentRecord._id;
    await order.save();

    return res.status(201).json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentRecordId: paymentRecord._id,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    if (session) session.endSession();
  }
};

exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return res.status(400).json({ success: false, message: 'Missing fields' });

    const ok = RazorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!ok) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'completed';
    payment.transactionId = razorpayPaymentId;
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.paymentId = payment._id;
      await order.save();
    }

    return res.status(200).json({ success: true, message: 'Payment verified', data: payment });
  } catch (err) {
    next(err);
  }
};

exports.confirmCOD = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const userId = req.user.id;
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    const order = await Order.findById(orderId).session(session);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.paymentMethod !== 'cod') return res.status(400).json({ success: false, message: 'Order is not COD' });

    const seller = await Seller.findOne({ userId }).session(session);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (order.sellerId.toString() !== seller._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });

    if (order.orderStatus !== 'delivered') return res.status(400).json({ success: false, message: 'Confirm COD after delivery' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ success: false, message: 'Payment already recorded' });

    if (session) session.startTransaction();

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

    order.paymentStatus = 'paid';
    order.paymentId = payment._id;
    await order.save({ session });

    try {
      const s = await Seller.findById(order.sellerId).session(session);
      if (s && s.statistics) {
        s.statistics.totalEarnings = (s.statistics.totalEarnings || 0) + payment.sellerAmount;
        s.statistics.pendingEarnings = Math.max(0, (s.statistics.pendingEarnings || 0) - payment.sellerAmount);
        await s.save({ session });
      }
    } catch (e) {
      // non-fatal
    }

    if (session) await session.commitTransaction();
    if (session) session.endSession();

    return res.status(200).json({ success: true, message: 'COD confirmed', data: payment });
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) {}
      session.endSession();
    }
    next(err);
  }
};

exports.getPayment = async (req, res, next) => {
  try {
    const requester = req.user;
    const id = req.params.id;
    const payment = await Payment.findById(id).populate('orderId', 'orderId orderStatus');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (requester.role === 'admin') return res.status(200).json({ success: true, data: payment });
    if (requester.role === 'seller' && payment.sellerId.toString() === requester.id) return res.status(200).json({ success: true, data: payment });
    if (requester.role === 'customer' && payment.customerId.toString() === requester.id) return res.status(200).json({ success: true, data: payment });

    return res.status(403).json({ success: false, message: 'Not authorized' });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const requester = req.user;
    const orderId = req.params.orderId;
    const payment = await Payment.findOne({ orderId }).populate('orderId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (requester.role === 'admin') return res.status(200).json({ success: true, data: payment });
    if (requester.role === 'seller') {
      const seller = await Seller.findOne({ userId: requester.id });
      if (seller && payment.sellerId.toString() === seller._id.toString()) return res.status(200).json({ success: true, data: payment });
    }
    if (requester.role === 'customer' && payment.customerId.toString() === requester.id) return res.status(200).json({ success: true, data: payment });

    return res.status(403).json({ success: false, message: 'Not authorized' });
  } catch (err) {
    next(err);
  }
};