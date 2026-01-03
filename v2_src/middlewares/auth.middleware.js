/**
 * src/middlewares/auth.middleware.js
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = { id: decoded.id, role: decoded.role };

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !user.isActive || user.isBlocked) return res.status(401).json({ success: false, message: 'User not authorized' });

    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
};