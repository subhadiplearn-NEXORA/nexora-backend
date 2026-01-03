const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect middleware
 * - Reads Authorization header 'Bearer <token>'
 * - Verifies token
 * - Attaches req.user = { id, role }
 */
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Attach user info (don't fetch sensitive fields unless needed)
    req.user = { id: decoded.id, role: decoded.role };

    // Optionally verify user still exists and active
    const user = await User.findById(req.user.id).select('+password');
    if (!user || !user.isActive || user.isBlocked) {
      return res.status(401).json({ success: false, message: 'User not authorized' });
    }

    // Set req.currentUser to full user if controllers need it
    req.currentUser = user;

    next();
  } catch (err) {
    next(err);
  }
};