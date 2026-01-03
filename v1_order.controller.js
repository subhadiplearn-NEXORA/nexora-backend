const Order = require('../models/Order');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const User = require('../models/User');

// Generate unique order ID
const generateOrderId = () => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Customer: Place Order
exports.placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const customerId = req.userId;

    if (!items || items.length === 0) {
      return res. status(400).json({ success: false, message: 'No items in order' });
    }

    // Calculate totals and get seller
    let totalAmount = 0;
    const processedItems = [];
    let sellerId = null;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      if (! sellerId) sellerId = product.sellerId;
      if (product.sellerId.toString() !== sellerId.toString()) {
        return res.status(400).json({ success: false, message: 'All products must be from same seller' });
      }

      const itemTotal = product.price * item. quantity;
      totalAmount += itemTotal;

      processedItems.push({
        productId: product._id,
        title: product.title,
        quantity: item.quantity,
        price: product.price,
        totalPrice: itemTotal,
      });

      // Decrease stock
      await product.decreaseStock(item.quantity);
    }

    // Get seller for commission calculation
    const seller = await Seller.findById(sellerId);
    const commission = (totalAmount * seller.commissionRate) / 100;
    const sellerAmount = totalAmount - commission;

    // Create order
    const order = new Order({
      orderId: generateOrderId(),
      customerId,
      sellerId,
      items: processedItems,
      totalAmount,
      commission,
      sellerAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
      orderStatus: 'pending',
    });

    await order.save();

    // Update seller stats
    await seller.recordOrder(totalAmount, false);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message:  error.message });
  }
};

// Customer: View Own Orders
exports.listCustomerOrders = async (req, res) => {
  try {
    const customerId = req.userId;
    const { page = 1, limit = 10 } = req. query;
    const skip = (page - 1) * limit;

    const orders = await Order. find({ customerId })
      .populate('sellerId', 'shopName')
      .populate('items.productId', 'title')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments({ customerId });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { total, page, pages:  Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seller: View Own Orders
exports. listSellerOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const seller = await Seller.findOne({ userId });
    if (!seller) {
      return res.status(404).json({ success: false, message:  'Seller profile not found' });
    }

    const orders = await Order.find({ sellerId: seller._id })
      .populate('customerId', 'name email phone')
      .populate('items. productId', 'title')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments({ sellerId: seller._id });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { total, page, pages: Math. ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seller/Admin: Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;
    const userId = req.userId;

    const order = await Order. findById(id).populate('sellerId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization
    if (order.sellerId.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    await order.updateStatus(orderStatus);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error. message });
  }
};

// Admin: List All Orders
exports.listAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderStatus, paymentMethod } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const orders = await Order.find(filter)
      .populate('customerId', 'name email')
      .populate('sellerId', 'shopName')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order. countDocuments(filter);

    res.status(200).json({
      success: true,
      data: orders,
      pagination:  { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Order Details
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order. findById(id)
      .populate('customerId')
      .populate('sellerId', 'shopName')
      .populate('items.productId');

    if (!order) {
      return res.status(404).json({ success: false, message:  'Order not found' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};