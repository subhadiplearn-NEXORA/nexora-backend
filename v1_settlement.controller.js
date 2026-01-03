const Settlement = require('../models/Settlement');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

// Admin: Create Settlement
exports.createSettlement = async (req, res) => {
  try {
    const { sellerId, startDate, endDate } = req.body;

    // Find all completed orders in period
    const orders = await Order.find({
      sellerId,
      orderStatus: 'delivered',
      createdAt: { $gte:  new Date(startDate), $lte: new Date(endDate) },
    });

    if (orders.length === 0) {
      return res.status(400).json({ success: false, message: 'No orders found for settlement period' });
    }

    // Calculate totals
    let totalAmount = 0;
    let totalCommission = 0;

    orders.forEach(order => {
      totalAmount += order.totalAmount;
      totalCommission += order.commission;
    });

    const payableAmount = totalAmount - totalCommission;

    const settlement = new Settlement({
      sellerId,
      settlementPeriod: { startDate:  new Date(startDate), endDate: new Date(endDate) },
      orders:  orders. map(o => o._id),
      totalOrders: orders.length,
      totalAmount,
      totalCommission,
      payableAmount,
      netPayable: payableAmount,
    });

    await settlement.save();
    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: List All Settlements
exports.listSettlements = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) filter.status = status;

    const settlements = await Settlement.find(filter)
      .populate('sellerId', 'shopName')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Settlement.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: settlements,
      pagination: { total, page, pages: Math. ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Mark Settlement as Paid
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const settlement = await Settlement. findById(id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    await settlement.markAsPaid(paymentMethod, transactionId);

    // Update seller earnings
    const seller = await Seller.findById(settlement.sellerId);
    await seller.updateStatistics({
      totalEarnings: seller.statistics.totalEarnings + settlement. netPayable,
      pendingEarnings: Math.max(0, seller.statistics.pendingEarnings - settlement.netPayable),
    });

    res.status(200).json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seller: View Earnings
exports.getSellerEarnings = async (req, res) => {
  try {
    const userId = req.userId;

    const seller = await Seller. findOne({ userId });
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found' });
    }

    const settlements = await Settlement.find({ sellerId: seller._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: seller.statistics.totalEarnings,
        pendingEarnings:  seller.statistics.pendingEarnings,
        withdrawnAmount: seller.statistics.withdrawnAmount,
        settlements,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error. message });
  }
};

// Seller: View Settlement Details
exports.getSettlementDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const settlement = await Settlement.findById(id)
      .populate('orders')
      .populate('sellerId', 'shopName');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    res.status(200).json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};