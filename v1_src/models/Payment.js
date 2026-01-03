const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },

    // Payment metadata
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },

    // Razorpay fields (for online payments)
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    // Transaction / reconciliation
    transactionId: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending', index: true },

    // Commission snapshot (at time of payment)
    commission: { type: Number, default: 0, min: 0 },
    sellerAmount: { type: Number, default: 0, min: 0 },

    // Refund info
    refundId: { type: String, default: null },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundStatus: { type: String, enum: ['pending', 'completed', 'failed', null], default: null },

    notes: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ sellerId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);