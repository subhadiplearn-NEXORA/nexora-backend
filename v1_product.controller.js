const Product = require('../models/Product');
const Seller = require('../models/Seller');

// Seller:  Create Product
exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, category, subCategory, images, codAvailable, stock } = req.body;
    const userId = req.userId;

    // Find seller by userId
    const seller = await Seller.findOne({ userId });
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found' });
    }

    if (seller.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Seller not approved yet' });
    }

    // Create product
    const product = new Product({
      sellerId: seller._id,
      title,
      description,
      price,
      category,
      subCategory,
      images,
      codAvailable:  codAvailable && seller.codEnabled,
      stock,
    });

    await product.save();

    // Update seller product count
    await seller.updateStatistics({ totalProducts: seller.statistics.totalProducts + 1 });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seller: Update Own Product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const product = await Product.findById(id).populate('sellerId');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if seller owns this product
    if (product.sellerId.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    // Update fields
    const allowedFields = ['title', 'description', 'price', 'category', 'subCategory', 'images', 'stock', 'tags'];
    allowedFields.forEach(field => {
      if (req.body[field]) {
        product[field] = req.body[field];
      }
    });

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seller: List Own Products
exports.listSellerProducts = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const seller = await Seller.findOne({ userId });
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found' });
    }

    const skip = (page - 1) * limit;
    const products = await Product.find({ sellerId: seller._id })
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product. countDocuments({ sellerId: seller._id });

    res.status(200).json({
      success: true,
      data: products,
      pagination:  { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: List Active Products
exports.listActiveProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, subCategory, minPrice, maxPrice } = req.query;
    const skip = (page - 1) * limit;

    let filter = { isActive: true };
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    const products = await Product.find(filter)
      .populate('sellerId', 'shopName')
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      pagination: { total, page, pages: Math. ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: Get Product Details
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('sellerId', 'shopName averageRating totalReviews');
    if (!product || !product.isActive) {
      return res. status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message:  error.message });
  }
};

// Admin: List All Products
exports.listAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const products = await Product.find(filter)
      .populate('sellerId', 'shopName')
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data:  products,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Toggle Product Status
exports.toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const product = await Product. findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.toggleStatus(isActive);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message:  error.message });
  }
};