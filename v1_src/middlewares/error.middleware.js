/**
 * src/middlewares/error.middleware.js
 */
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(err.errors).map((e) => e.message) });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate field value', field: Object.keys(err.keyPattern || {})[0] || null });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};