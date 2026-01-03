/**
 * src/controllers/auth.controller.js
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/env');

function generateToken(user) {
  const payload = { id: user._id.toString(), role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE || '7d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'customer', phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password required' });

    if (role === 'admin') return res.status(403).json({ success: false, message: 'Cannot register as admin' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = new User({ name, email: email.toLowerCase(), password, role, phone: phone || null });
    await user.save();

    const token = generateToken(user);

    return res.status(201).json({ success: true, data: { user: user.toJSON(), token } });
  } catch (err) {
    logger.error('Register error', err);
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isActive || user.isBlocked) return res.status(403).json({ success: false, message: 'Account disabled' });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    return res.status(200).json({ success: true, data: { user: user.toJSON(), token } });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  // Stateless JWT - client discards token
  res.status(200).json({ success: true, message: 'Logout successful' });
};