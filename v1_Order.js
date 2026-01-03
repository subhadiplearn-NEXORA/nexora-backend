const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Order Identifier
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // References
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

    // Order Items
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        title: String,
        quantity: {
          type: Number,
          required: true,
          min:  1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Pricing
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    commission: {
      type: Number,
      default: 0,
      min: 0,
    },

    sellerAmount: {
      type: Number,
      default: 0,
      min:  0,
    },

    // Shipping Address
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // Payment Details
    paymentMethod: {
      type: String,
      enum: ['cod', 'online'],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    // Order Status
    orderStatus: {
      type: String,
      enum:  ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Additional Info
    notes: String,
    trackingNumber: String,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps:  true,
  }
);

// Indexes
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentMethod: 1 });

// Methods
orderSchema.methods.updateStatus = async function (newStatus) {
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status.  Must be one of: ${validStatuses.join(', ')}`);
  }
  this.orderStatus = newStatus;
  return await this.save();
};

orderSchema.methods.cancel = async function (reason) {
  if (this.orderStatus === 'delivered' || this.orderStatus === 'cancelled') {
    throw new Error(`Cannot cancel ${this.orderStatus} order`);
  }
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return await this.save();
};

module.exports = mongoose.model('Order', orderSchema);