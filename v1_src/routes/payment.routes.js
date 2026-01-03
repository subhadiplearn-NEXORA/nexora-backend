const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  };
};

/**
 * Create Razorpay order for an existing platform order
 * Access: customer (placing the payment) or admin/system
 */
router.post(
  '/razorpay/create-order',
  protect,
  validate([body('orderId').isMongoId().withMessage('Valid orderId required')]),
  paymentController.createRazorpayOrder
);

/**
 * Verify Razorpay payment (backend)
 * Access: internal/customer
 */
router.post(
  '/razorpay/verify',
  protect,
  validate([
    body('razorpayOrderId').notEmpty(),
    body('razorpayPaymentId').notEmpty(),
    body('razorpaySignature').notEmpty(),
  ]),
  paymentController.verifyRazorpayPayment
);

/**
 * Seller confirms COD collection for an order
 * Access: seller
 */
router.post(
  '/cod/confirm',
  protect,
  authorize('seller'),
  validate([body('orderId').isMongoId().withMessage('Valid orderId required')]),
  paymentController.confirmCOD
);

/**
 * Get payment
 */
router.get('/:id', protect, validate([param('id').isMongoId()]), paymentController.getPayment);

/**
 * Get payment by order id
 */
router.get('/by-order/:orderId', protect, validate([param('orderId').isMongoId()]), paymentController.getPaymentByOrder);

module.exports = router;