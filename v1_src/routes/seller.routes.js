/**
 * src/routes/seller.routes.js
 */
const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// Seller create profile
router.post('/seller', protect, authorize('seller'), validate([body('shopName').notEmpty(), body('businessType').isIn(['local', 'dropship'])]), sellerController.createSellerProfile);

// Seller get own profile
router.get('/seller/me', protect, authorize('seller'), sellerController.getMySellerProfile);

// Admin endpoints
router.get('/admin/sellers', protect, authorize('admin'), sellerController.listSellers);
router.post('/admin/seller/approve/:id', protect, authorize('admin'), validate([param('id').isMongoId()]), sellerController.approveSeller);
router.post('/admin/seller/block/:id', protect, authorize('admin'), validate([param('id').isMongoId(), body('reason').optional().isString()]), sellerController.blockSeller);
router.patch('/admin/seller/:id/commission', protect, authorize('admin'), validate([param('id').isMongoId(), body('commissionRate').isFloat({ min: 0, max: 100 })]), sellerController.updateCommission);

module.exports = router;