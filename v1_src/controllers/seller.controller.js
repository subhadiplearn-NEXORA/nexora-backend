/**
 * src/controllers/seller.controller.js
 */
const Seller = require('../models/Seller');
const User = require('../models/User');

exports.createSellerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;

    // Prevent creating multiple seller profiles
    const existing = await Seller.findOne({ userId });
    if (existing) return res.status(409).json({ success: false, message: 'Seller profile already exists' });

    const seller = new Seller({
      userId,
      shopName: payload.shopName,
      shopDescription: payload.shopDescription || '',
      businessType: payload.businessType || 'local',
      codEnabled: !!payload.codEnabled,
      commissionRate: payload.commissionRate || undefined,
      bankDetails: payload.bankDetails || {},
    });

    await seller.save();
    return res.status(201).json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

exports.getMySellerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const seller = await Seller.findOne({ userId }).populate('userId', 'name email');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    return res.status(200).json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

// Admin endpoints
exports.listSellers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Seller.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('userId', 'name email'),
      Seller.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.approveSeller = async (req, res, next) => {
  try {
    const sellerId = req.params.id;
    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    seller.status = 'approved';
    seller.approvedAt = new Date();
    await seller.save();
    return res.status(200).json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

exports.blockSeller = async (req, res, next) => {
  try {
    const sellerId = req.params.id;
    const { reason } = req.body;
    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    seller.status = 'blocked';
    seller.blockedReason = reason || 'Blocked by admin';
    seller.blockedAt = new Date();
    seller.isActive = false;
    await seller.save();
    return res.status(200).json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

exports.updateCommission = async (req, res, next) => {
  try {
    const sellerId = req.params.id;
    const { commissionRate } = req.body;
    if (commissionRate < 0 || commissionRate > 100) return res.status(400).json({ success: false, message: 'Invalid commission rate' });

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    seller.commissionRate = commissionRate;
    await seller.save();
    return res.status(200).json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};