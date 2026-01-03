/**
 * src/models/Payment.js
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    transactionId: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending', index: true },
    commission: { type: Number, default: 0, min: 0 },
    sellerAmount: { type: Number, default: 0, min: 0 },
    refundId: { type: String, default: null },
    refundAmount: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ['pending', 'completed', 'failed', null], default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);