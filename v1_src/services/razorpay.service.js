const Razorpay = require('razorpay');
const crypto = require('crypto');

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_CURRENCY = 'INR',
} = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  // In production these must be set; in development you may mock or skip
  console.warn('Razorpay credentials are not configured in env.');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * amount: number (INR, rupees)
 * returns razorpay order object
 */
async function createOrder({ amount, currency = RAZORPAY_CURRENCY, receipt, payment_capture = 1 }) {
  const options = {
    amount: Math.round(amount * 100), // paise
    currency,
    receipt,
    payment_capture,
  };
  return razorpay.orders.create(options);
}

/**
 * Verify razorpay signature
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} signature
 * @returns {boolean}
 */
function verifySignature(razorpayOrderId, razorpayPaymentId, signature) {
  const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * Fetch payment / order from Razorpay (optional)
 */
async function fetchPayment(paymentId) {
  return razorpay.payments.fetch(paymentId);
}

module.exports = {
  createOrder,
  verifySignature,
  fetchPayment,
  client: razorpay,
};