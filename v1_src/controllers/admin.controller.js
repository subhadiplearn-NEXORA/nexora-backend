/**
 * src/controllers/admin.controller.js
 * Admin-level helpers: settlements and platform settings
 */
const Settlement = require('../models/Settlement');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

/**
 * Create settlement for a seller for provided period
 * POST /api/admin/settlements
 * body: { sellerId, startDate, endDate }
 */
exports.createSettlement = async (req, res, next) => {
  try {
    const { sellerId, startDate, endDate } = req.body;
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (!sellerId || isNaN(sDate) || isNaN(eDate)) return res.status(400).json({ success: false, message: 'Invalid input' });

    // find delivered & paid orders in period
    const orders = await Order.find({
      sellerId,
      orderStatus: 'delivered',
      paymentStatus: 'paid',
      createdAt: { $gte: sDate, $lte: eDate },
    });

    if (!orders || orders.length === 0) return res.status(400).json({ success: false, message: 'No eligible orders' });

    let totalAmount = 0;
    let totalCommission = 0;
    const orderIds = [];
    orders.forEach((o) => {
      totalAmount += o.totalAmount;
      totalCommission += o.commission || 0;
      orderIds.push(o._id);
    });

    const payable = totalAmount - totalCommission;
    const settlement = new Settlement({
      sellerId,
      settlementPeriod: { startDate: sDate, endDate: eDate },
      orders: orderIds,
      totalOrders: orders.length,
      totalAmount,
      totalCommission,
      payableAmount: payable,
      netPayable: payable,
      status: 'pending',
    });

    await settlement.save();
    return res.status(201).json({ success: true, data: settlement });
  } catch (err) {
    next(err);
  }
};

exports.listSettlements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Settlement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sellerId', 'shopName'),
      Settlement.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.markSettlementPaid = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { paymentMethod, transactionId } = req.body;
    const settlement = await Settlement.findById(id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    settlement.status = 'paid';
    settlement.paymentMethod = paymentMethod || 'manual';
    settlement.transactionId = transactionId || null;
    settlement.paidAt = new Date();
    await settlement.save();

    // Update seller stats
    const seller = await Seller.findById(settlement.sellerId);
    if (seller && seller.statistics) {
      seller.statistics.totalEarnings = Math.max(0, (seller.statistics.totalEarnings || 0) - settlement.netPayable);
      seller.statistics.withdrawnAmount = (seller.statistics.withdrawnAmount || 0) + settlement.netPayable;
      await seller.save();
    }

    return res.status(200).json({ success: true, data: settlement });
  } catch (err) {
    next(err);
  }
};

exports.getSellerEarnings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    const settlements = await Settlement.find({ sellerId: seller._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: {
        totalEarnings: seller.statistics.totalEarnings,
        pendingEarnings: seller.statistics.pendingEarnings,
        withdrawnAmount: seller.statistics.withdrawnAmount,
        settlements,
      },
    });
  } catch (err) {
    next(err);
  }
};