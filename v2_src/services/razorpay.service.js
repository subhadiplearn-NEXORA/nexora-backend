/**
 * src/services/razorpay.service.js
 */
const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_CURRENCY = 'INR' } = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  logger.warn('Razorpay credentials not set in env.');
}

const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

async function createOrder({ amount, currency = RAZORPAY_CURRENCY, receipt, payment_capture = 1 }) {
  const options = { amount: Math.round(amount * 100), currency, receipt, payment_capture };
  return razorpay.orders.create(options);
}

function verifySignature(razorpayOrderId, razorpayPaymentId, signature) {
  const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  return hmac.digest('hex') === signature;
}

async function fetchPayment(paymentId) {
  return razorpay.payments.fetch(paymentId);
}

module.exports = { createOrder, verifySignature, fetchPayment, client: razorpay };