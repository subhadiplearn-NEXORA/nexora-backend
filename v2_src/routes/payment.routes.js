/**
 * src/routes/payment.routes.js
 */
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { body, param, validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.post('/payments/razorpay/create-order', protect, validate([body('orderId').isMongoId()]), paymentController.createRazorpayOrder);
router.post('/payments/razorpay/verify', protect, validate([body('razorpayOrderId').notEmpty(), body('razorpayPaymentId').notEmpty(), body('razorpaySignature').notEmpty()]), paymentController.verifyRazorpayPayment);
router.post('/payments/cod/confirm', protect, authorize('seller'), validate([body('orderId').isMongoId()]), paymentController.confirmCOD);
router.get('/payments/:id', protect, validate([param('id').isMongoId()]), paymentController.getPayment);
router.get('/payments/by-order/:orderId', protect, validate([param('orderId').isMongoId()]), paymentController.getPaymentByOrder);

module.exports = router;