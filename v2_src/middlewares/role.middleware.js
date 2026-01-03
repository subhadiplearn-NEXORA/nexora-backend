/**
 * src/middlewares/role.middleware.js
 */
exports.authorize = (...allowed) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    next();
  };
};