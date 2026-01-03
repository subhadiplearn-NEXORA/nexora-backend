const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: [true, 'Seller ID is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },

    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },

    subCategory: {
      type: String,
      trim: true,
      index: true,
    },

    images: {
      type: [String], // URLs (Cloudinary)
      default: [],
    },

    codAvailable: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: false, // optional uniqueness if you plan to enforce per seller later
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text index for search
productSchema.index({ title: 'text', description: 'text' });

// Pre-save hook to update updatedAt
productSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
productSchema.methods.toggleActive = async function (isActive) {
  this.isActive = !!isActive;
  return await this.save();
};

productSchema.methods.adjustStock = async function (delta) {
  const newStock = this.stock + delta;
  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }
  this.stock = newStock;
  return await this.save();
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;