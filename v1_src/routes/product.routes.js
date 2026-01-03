const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation helper
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  };
};

/**
 * Seller: Create product
 */
router.post(
  '/',
  protect,
  authorize('seller'),
  validate([
    body('title').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('price').isFloat({ gt: 0 }),
    body('category').isString().notEmpty(),
    body('images').optional().isArray(),
    body('codAvailable').optional().isBoolean(),
    body('stock').optional().isInt({ min: 0 }),
  ]),
  productController.createProduct
);

/**
 * Seller: Update own product
 */
router.put(
  '/:id',
  protect,
  authorize('seller'),
  validate([param('id').isMongoId()]),
  productController.updateProduct
);

/**
 * Seller: list own products
 */
router.get('/my', protect, authorize('seller'), productController.listMyProducts);

/**
 * Admin: list all products
 */
router.get('/all', protect, authorize('admin'), productController.listAllProducts);

/**
 * Admin: toggle product status
 */
router.patch(
  '/status/:id',
  protect,
  authorize('admin'),
  validate([param('id').isMongoId(), body('isActive').isBoolean()]),
  productController.toggleProductStatus
);

/**
 * Admin: delete product
 */
router.delete('/:id', protect, authorize('admin'), validate([param('id').isMongoId()]), productController.deleteProduct);

/**
 * Public: list active products with filters
 */
router.get('/active', productController.listActiveProducts);

/**
 * Public: product details
 */
router.get('/:id', validate([param('id').isMongoId()]), productController.getProductById);

module.exports = router;