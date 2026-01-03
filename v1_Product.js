const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Link to Seller
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: [true, 'Seller ID is required'],
      index: true,
    },

    // Product Information
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },

    description: {
      type:  String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    // Pricing
    price: {
      type: Number,
      required:  [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: 'Price must be greater than 0',
      },
    },

    originalPrice: {
      type: Number,
      min: [0, 'Original price cannot be negative'],
    },

    discount: {
      type: Number,
      default: 0,
      min:  0,
      max: 100,
    },

    // Category
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },

    subCategory: {
      type: String,
      required: [true, 'Sub-category is required'],
      trim: true,
      index: true,
    },

    // Images
    images: {
      type: [String],
      required: [true, 'At least one image is required'],
      validate: {
        validator: function (value) {
          return value. length > 0;
        },
        message: 'At least one image is required',
      },
    },

    // Inventory
    stock: {
      type: Number,
      required:  [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    // COD Availability
    codAvailable: {
      type: Boolean,
      default: false,
    },

    // Status
    isActive: {
      type: Boolean,
      default:  true,
      index: true,
    },

    // Ratings
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalSold:  {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tags
    tags:  {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ sellerId: 1, isActive: 1 });
productSchema.index({ category: 1, subCategory: 1 });
productSchema.index({ title: 'text', description:  'text' });
productSchema.index({ createdAt: -1 });
productSchema.index({ rating: -1 });

// Methods
productSchema.methods. toggleStatus = async function (isActive) {
  this.isActive = isActive;
  return await this.save();
};

productSchema.methods.decreaseStock = async function (quantity) {
  if (this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  this.totalSold += quantity;
  return await this.save();
};

productSchema.methods. increaseStock = async function (quantity) {
  this.stock += quantity;
  return await this. save();
};

module.exports = mongoose.model('Product', productSchema);