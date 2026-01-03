/**
 * src/models/Settlement.js
 */
const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    settlementPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    totalOrders: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    payableAmount: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'processed', 'paid'], default: 'pending', index: true },
    paymentMethod: { type: String, enum: ['bank_transfer', 'cheque', 'manual'], default: null },
    transactionId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settlement', settlementSchema);