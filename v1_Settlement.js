const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    // Reference
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },

    // Settlement Period
    settlementPeriod: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },

    // Orders in Settlement
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],

    // Calculations
    totalOrders: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCommission: {
      type: Number,
      required: true,
      min: 0,
    },

    payableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Refunds & Adjustments
    refunds:  {
      type: Number,
      default: 0,
      min: 0,
    },

    adjustments: {
      type: Number,
      default:  0,
    },

    // Net Payable
    netPayable: {
      type: Number,
      required:  true,
      min: 0,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'processed', 'paid'],
      default: 'pending',
      index: true,
    },

    // Payment Info
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'manual'],
      default: null,
    },

    transactionId: String,
    paidAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
settlementSchema.index({ sellerId: 1, createdAt: -1 });
settlementSchema.index({ status: 1 });
settlementSchema.index({ 'settlementPeriod.startDate': 1 });

// Methods
settlementSchema.methods.markAsProcessed = async function () {
  this.status = 'processed';
  return await this.save();
};

settlementSchema.methods.markAsPaid = async function (paymentMethod, transactionId) {
  this.status = 'paid';
  this.paymentMethod = paymentMethod;
  this.transactionId = transactionId;
  this.paidAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('Settlement', settlementSchema);