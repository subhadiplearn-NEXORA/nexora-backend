/**
 * src/models/Product.js
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, index: true },
    subCategory: { type: String, trim: true, index: true },
    images: { type: [String], default: [] }, // Cloudinary URLs
    codAvailable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text' });

productSchema.methods.toggleActive = async function (isActive) {
  this.isActive = !!isActive;
  return this.save();
};

productSchema.methods.adjustStock = async function (delta) {
  const newStock = this.stock + delta;
  if (newStock < 0) throw new Error('Insufficient stock');
  this.stock = newStock;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);