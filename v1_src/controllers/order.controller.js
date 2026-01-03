/**
 * src/controllers/order.controller.js
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const logger = require('../utils/logger');

const validTransitions = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const customerId = req.user.id;
    const { items, paymentMethod, shippingAddress, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items provided' });
    if (!['online', 'cod'].includes(paymentMethod)) return res.status(400).json({ success: false, message: 'Invalid paymentMethod' });

    if (session) session.startTransaction();

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    if (products.length !== productIds.length) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'One or more products not found' });
    }

    const sellerId = products[0].sellerId.toString();
    for (const p of products) {
      if (p.sellerId.toString() !== sellerId) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'All products must belong to the same seller' });
      }
    }

    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    if (seller.status !== 'approved' || !seller.isActive) {
      if (session) await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Seller not active/approved' });
    }

    const processed = [];
    let totalAmount = 0;
    for (const it of items) {
      const prod = products.find((p) => p._id.toString() === it.productId);
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Invalid quantity' });
      }
      if (!prod.isActive) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Product ${prod._id} is not active` });
      }
      if (prod.stock < qty) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Insufficient stock for product ${prod._id}` });
      }
      if (paymentMethod === 'cod' && (!prod.codAvailable || !seller.codEnabled)) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: `COD not available for product ${prod._id}` });
      }

      const itemTotal = prod.price * qty;
      processed.push({ productId: prod._id, title: prod.title, quantity: qty, price: prod.price, totalPrice: itemTotal });
      totalAmount += itemTotal;

      prod.stock = prod.stock - qty;
      await prod.save({ session });
    }

    const commissionRate = Number(seller.commissionRate || 0);
    const commission = Number(((totalAmount * commissionRate) / 100).toFixed(2));
    const sellerAmount = Number((totalAmount - commission).toFixed(2));

    const orderId = Order.generateOrderId ? Order.generateOrderId() : 'ORD-' + Date.now();
    const order = new Order({
      orderId,
      customerId,
      sellerId: seller._id,
      items: processed,
      totalAmount,
      commission,
      sellerAmount,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'placed',
      shippingAddress: shippingAddress || {},
      notes: notes || null,
    });

    await order.save({ session });

    try {
      seller.statistics.totalOrders = (seller.statistics.totalOrders || 0) + 1;
      seller.statistics.pendingEarnings = (seller.statistics.pendingEarnings || 0) + sellerAmount;
      await seller.save({ session });
    } catch (e) {
      logger.warn('Seller stats update failed', e.message || e);
    }

    if (session) await session.commitTransaction();
    if (session) session.endSession();

    const created = await Order.findById(order._id).populate('items.productId', 'title').populate('sellerId', 'shopName');
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) {}
      session.endSession();
    }
    next(err);
  }
};

exports.listCustomerOrders = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sellerId', 'shopName'),
      Order.countDocuments({ customerId }),
    ]);

    return res.status(200).json({ success: true, data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.listSellerOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find({ sellerId: seller._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('customerId', 'name email'),
      Order.countDocuments({ sellerId: seller._id }),
    ]);

    return res.status(200).json({ success: true, data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.listAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, orderStatus, paymentMethod } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sellerId', 'shopName').populate('customerId', 'name email'),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const actorId = req.user.id;
    const actorRole = req.user.role;
    const orderId = req.params.id;
    const { orderStatus } = req.body;

    if (!orderStatus) return res.status(400).json({ success: false, message: 'orderStatus required' });

    const order = await Order.findById(orderId).session(session);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (actorRole === 'seller') {
      const seller = await Seller.findOne({ userId: actorId }).session(session);
      if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
      if (order.sellerId.toString() !== seller._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    } else if (actorRole === 'customer') {
      return res.status(403).json({ success: false, message: 'Customers cannot update order status' });
    }

    const current = order.orderStatus;
    if (!validTransitions[current].includes(orderStatus)) {
      if (current !== orderStatus) return res.status(400).json({ success: false, message: `Invalid transition ${current} -> ${orderStatus}` });
    }

    if (session) session.startTransaction();

    if (orderStatus === 'cancelled') {
      if (order.orderStatus === 'delivered') {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Cannot cancel delivered order' });
      }
      for (const it of order.items) {
        const prod = await Product.findById(it.productId).session(session);
        if (prod) {
          prod.stock = prod.stock + it.quantity;
          await prod.save({ session });
        }
      }
      order.cancelledAt = new Date();
      order.cancelledBy = actorId;
      order.cancelReason = req.body.cancelReason || null;

      try {
        const seller = await Seller.findById(order.sellerId).session(session);
        if (seller && seller.statistics) {
          seller.statistics.totalOrders = Math.max(0, (seller.statistics.totalOrders || 1) - 1);
          seller.statistics.pendingEarnings = Math.max(0, (seller.statistics.pendingEarnings || 0) - order.sellerAmount);
          await seller.save({ session });
        }
      } catch (e) {
        logger.warn('Failed to update seller stats on cancellation', e.message || e);
      }
    }

    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date();
    }

    order.orderStatus = orderStatus;
    await order.save({ session });

    if (session) await session.commitTransaction();
    if (session) session.endSession();

    const updated = await Order.findById(order._id).populate('items.productId', 'title').populate('sellerId', 'shopName');

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) {}
      session.endSession();
    }
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const requester = req.user;
    const id = req.params.id;
    const order = await Order.findById(id).populate('items.productId', 'title images').populate('customerId', 'name email').populate('sellerId', 'shopName');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (requester.role === 'customer' && order.customerId._id.toString() !== requester.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (requester.role === 'seller') {
      const seller = await Seller.findOne({ userId: requester.id });
      if (!seller || order.sellerId._id.toString() !== seller._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};