/**
 * src/models/Seller.js
 */
const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    shopName: { type: String, required: true, trim: true },
    shopDescription: { type: String, default: '', trim: true },
    shopImage: { type: String, default: null },
    businessType: { type: String, enum: ['local', 'dropship'], required: true },
    commissionRate: { type: Number, required: true, default: 5, min: 0, max: 100 },
    codEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending' },
    blockedReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    blockedAt: { type: Date, default: null },
    bankDetails: {
      accountHolderName: String,
      accountNumber: { type: String, select: false },
      ifscCode: String,
      bankName: String,
      upiId: String,
      isVerified: { type: Boolean, default: false },
    },
    statistics: {
      totalProducts: { type: Number, default: 0 },
      activeProducts: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      completedOrders: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 }, // collected by seller (COD) or settled amounts
      pendingEarnings: { type: Number, default: 0 }, // earnings not yet withdrawn/settled
      withdrawnAmount: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
    },
    verificationDocuments: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sellerSchema.index({ userId: 1 });
sellerSchema.index({ status: 1 });

sellerSchema.methods.approve = async function (byUserId) {
  this.status = 'approved';
  this.approvedAt = new Date();
  return this.save();
};

sellerSchema.methods.block = async function (reason, byUserId) {
  this.status = 'blocked';
  this.blockedReason = reason;
  this.blockedAt = new Date();
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Seller', sellerSchema);