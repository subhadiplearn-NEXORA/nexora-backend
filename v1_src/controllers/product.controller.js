const Product = require('../models/Product');
const Seller = require('../models/Seller');
const constants = require('../config/constants');

/**
 * Seller Create Product
 * POST /api/products
 * body: { title, description, price, category, subCategory, images[], codAvailable, stock, sku }
 */
exports.createProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;

    // Ensure seller profile exists and is approved
    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (seller.status !== 'approved' || !seller.isActive) {
      return res.status(403).json({ success: false, message: 'Seller not approved or inactive' });
    }

    // Sellers cannot enable COD on product if their account-level COD is disabled
    if (payload.codAvailable && !seller.codEnabled) {
      payload.codAvailable = false;
    }

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

    // Optionally update seller stats (denormalized fields)
    try {
      if (seller.statistics) {
        seller.statistics.totalProducts = (seller.statistics.totalProducts || 0) + 1;
        seller.statistics.activeProducts = seller.statistics.activeProducts + 1;
        await seller.save();
      }
    } catch (e) {
      // Non-fatal — continue
      console.warn('Failed to update seller stats:', e.message || e);
    }

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * Seller Update Own Product
 * PUT /api/products/:id
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.id;
    const updates = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Validate ownership
    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (product.sellerId.toString() !== seller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this product' });
    }

    // Prevent seller enabling COD if seller-level COD disabled
    if (updates.codAvailable && !seller.codEnabled) {
      updates.codAvailable = false;
    }

    const allowed = ['title', 'description', 'price', 'category', 'subCategory', 'images', 'codAvailable', 'stock', 'sku', 'isActive'];
    allowed.forEach((field) => {
      if (typeof updates[field] !== 'undefined') {
        product[field] = updates[field];
      }
    });

    await product.save();
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * Seller: List own products
 * GET /api/products/my
 */
exports.listMyProducts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = constants.DEFAULTS.PAGINATION_LIMIT } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const seller = await Seller.findOne({ userId });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });

    const filter = { sellerId: seller._id };
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: List active products
 * GET /api/products/active
 * Query support: page, limit, category, subCategory, minPrice, maxPrice, q (text search)
 */
exports.listActiveProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = constants.DEFAULTS.PAGINATION_LIMIT, category, subCategory, minPrice, maxPrice, q } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let query = Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sellerId', 'shopName statistics');

    if (q) {
      query = Product.find({ $text: { $search: q }, ...filter }).sort({ score: { $meta: 'textScore' } }).select({ score: { $meta: 'textScore' } }).skip(skip).limit(Number(limit));
      query = query.populate('sellerId', 'shopName statistics');
    }

    const [items, total] = await Promise.all([query.exec(), Product.countDocuments(filter)]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: Get product by ID
 * GET /api/products/:id
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'shopName statistics');
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all products
 * GET /api/products/all
 */
exports.listAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = constants.DEFAULTS.PAGINATION_LIMIT, isActive } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const filter = {};
    if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sellerId', 'shopName'),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Toggle product isActive
 * PATCH /api/products/status/:id
 * body: { isActive: boolean }
 */
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

/**
 * Admin: Delete product
 * DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Optionally decrement seller stats
    try {
      const seller = await Seller.findById(product.sellerId);
      if (seller && seller.statistics) {
        seller.statistics.totalProducts = Math.max(0, (seller.statistics.totalProducts || 1) - 1);
        seller.statistics.activeProducts = Math.max(0, (seller.statistics.activeProducts || 1) - 1);
        await seller.save();
      }
    } catch (e) {
      // non-fatal
      console.warn('Failed to update seller stats after product deletion:', e.message || e);
    }

    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};