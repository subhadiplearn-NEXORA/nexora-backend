const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // References
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },

    // Payment Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type:  String,
      enum: ['cod', 'razorpay'],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },

    // Razorpay Details
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,

    // Refund Info
    refunded: {
      type: Boolean,
      default: false,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundId: String,
    refundedAt: Date,
    refundReason: String,

    // Metadata
    failureReason: String,
  },
  {
    timestamps:  true,
  }
);

// Indexes
paymentSchema. index({ orderId: 1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ paymentMethod: 1 });

// Methods
paymentSchema.methods.markCompleted = async function (transactionId) {
  this.paymentStatus = 'completed';
  this.razorpayPaymentId = transactionId;
  return await this.save();
};

paymentSchema.methods.markFailed = async function (reason) {
  this.paymentStatus = 'failed';
  this.failureReason = reason;
  return await this.save();
};

paymentSchema.methods.refund = async function (amount, reason) {
  this.refunded = true;
  this.refundAmount = amount;
  this.refundedAt = new Date();
  this.refundReason = reason;
  return await this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);