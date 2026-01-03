/**
 * src/routes/product.routes.js
 */
const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// Seller create
router.post('/products', protect, authorize('seller'), validate([
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('price').isFloat({ gt: 0 }),
  body('category').notEmpty(),
]), productController.createProduct);

// Seller update
router.put('/products/:id', protect, authorize('seller'), validate([param('id').isMongoId()]), productController.updateProduct);

// Seller list own
router.get('/products/my', protect, authorize('seller'), productController.listMyProducts);

// Public list active
router.get('/products/active', validate([query('page').optional().isInt(), query('limit').optional().isInt()]), productController.listActiveProducts);

// Public product detail
router.get('/products/:id', validate([param('id').isMongoId()]), productController.getProductById);

// Admin list all
router.get('/admin/products', protect, authorize('admin'), productController.listAllProducts);

// Admin toggle status
router.patch('/admin/products/:id/status', protect, authorize('admin'), validate([param('id').isMongoId(), body('isActive').isBoolean()]), productController.toggleProductStatus);

// Admin delete
router.delete('/admin/products/:id', protect, authorize('admin'), validate([param('id').isMongoId()]), productController.deleteProduct);

module.exports = router;