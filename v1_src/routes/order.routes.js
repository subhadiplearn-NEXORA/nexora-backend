/**
 * src/routes/order.routes.js
 */
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// Customer places order
router.post('/orders', protect, authorize('customer'), validate([
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('paymentMethod').isIn(['online', 'cod']),
]), orderController.createOrder);

// Customer list own
router.get('/orders/my', protect, authorize('customer'), orderController.listCustomerOrders);

// Seller list own
router.get('/orders/seller', protect, authorize('seller'), orderController.listSellerOrders);

// Admin list all
router.get('/orders/all', protect, authorize('admin'), orderController.listAllOrders);

// Update status (seller/admin)
router.patch('/orders/:id/status', protect, validate([param('id').isMongoId(), body('orderStatus').notEmpty()]), orderController.updateOrderStatus);

// Get order details
router.get('/orders/:id', protect, validate([param('id').isMongoId()]), orderController.getOrder);

module.exports = router;