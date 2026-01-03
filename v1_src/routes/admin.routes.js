/**
 * src/routes/admin.routes.js
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.post('/admin/settlements', protect, authorize('admin'), validate([body('sellerId').isMongoId(), body('startDate').isISO8601(), body('endDate').isISO8601()]), adminController.createSettlement);
router.get('/admin/settlements', protect, authorize('admin'), adminController.listSettlements);
router.patch('/admin/settlements/:id/pay', protect, authorize('admin'), validate([param('id').isMongoId(), body('paymentMethod').optional().isString()]), adminController.markSettlementPaid);
router.get('/seller/earnings', protect, authorize('seller'), adminController.getSellerEarnings);

module.exports = router;