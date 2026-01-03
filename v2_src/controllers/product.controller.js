/**
 * src/controllers/product.controller.js
 */
const Product = require('../models/Product');
const Seller = require('../models/Seller');

exports.createProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;

    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (seller.status !== 'approved' || !seller.isActive) return res.status(403).json({ success: false, message: 'Seller not approved' });

    if (payload.codAvailable && !seller.codEnabled) payload.codAvailable = false;

    const product = new Product({
      sellerId: seller._id,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      subCategory: payload.subCategory || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      codAvailable: !!payload.codAvailable,
      stock: Number(payload.stock) || 0,
      sku: payload.sku || undefined,
    });

    await product.save();

    // update seller stats if present
    try {
      seller.statistics.totalProducts = (seller.statistics.totalProducts || 0) + 1;
      seller.statistics.activeProducts = (seller.statistics.activeProducts || 0) + 1;
      await seller.save();
    } catch (e) {
      // non-fatal
    }

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.id;
    const updates = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (product.sellerId.toString() !== seller._id.toString()) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (updates.codAvailable && !seller.codEnabled) updates.codAvailable = false;

    const allowed = ['title', 'description', 'price', 'category', 'subCategory', 'images', 'codAvailable', 'stock', 'sku', 'isActive'];
    allowed.forEach((f) => {
      if (typeof updates[f] !== 'undefined') product[f] = updates[f];
    });

    await product.save();

    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.listMyProducts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });

    const [items, total] = await Promise.all([
      Product.find({ sellerId: seller._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments({ sellerId: seller._id }),
    ]);

    return res.status(200).json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.listActiveProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, subCategory, minPrice, maxPrice, q } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let query;
    if (q) {
      query = Product.find({ $text: { $search: q }, ...filter }).sort({ score: { $meta: 'textScore' } });
    } else {
      query = Product.find(filter).sort({ createdAt: -1 });
    }

    query = query.skip(skip).limit(Number(limit)).populate('sellerId', 'shopName statistics');

    const [items, total] = await Promise.all([query.exec(), Product.countDocuments(filter)]);
    return res.status(200).json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'shopName statistics');
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.listAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const filter = {};
    if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sellerId', 'shopName'),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

exports.toggleProductStatus = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const { isActive } = req.body;
    product.isActive = !!isActive;
    await product.save();
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Try to update seller stats
    try {
      const seller = await Seller.findById(product.sellerId);
      if (seller && seller.statistics) {
        seller.statistics.totalProducts = Math.max(0, (seller.statistics.totalProducts || 1) - 1);
        seller.statistics.activeProducts = Math.max(0, (seller.statistics.activeProducts || 1) - 1);
        await seller.save();
      }
    } catch (e) {
      // non-fatal
    }

    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};