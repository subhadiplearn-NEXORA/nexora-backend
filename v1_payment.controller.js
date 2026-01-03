const Payment = require('../models/Payment');
const Order = require('../models/Order');

// Create Payment Record
exports.createPayment = async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message:  'Order not found' });
    }

    const payment = new Payment({
      orderId,
      customerId: order.customerId,
      sellerId: order.sellerId,
      amount,
      paymentMethod,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });

    await payment.save();
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify and Complete Payment
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId, orderId } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message:  'Payment not found' });
    }

    // Mark as completed
    await payment.markCompleted(payment.razorpayPaymentId);

    // Update order
    const order = await Order.findById(orderId);
    order.paymentStatus = 'completed';
    order.paymentId = paymentId;
    await order.save();

    res.status(200).json({ success: true, message: 'Payment verified', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Payment Details
exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message:  'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};