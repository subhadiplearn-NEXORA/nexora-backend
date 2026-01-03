const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token with user id + role
 * payload: { id, role }
 */
function generateToken(user) {
  const payload = { id: user._id.toString(), role: user.role };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * POST /api/auth/register
 * body: { name, email, password, role? (admin/seller/customer), phone? }
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'customer', phone } = req.body;

    // Basic validation (route also validates via middleware)
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    // Prevent users creating admin accounts via public register
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot register as admin' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone: phone || null,
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    // Include password in query (select)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isActive || user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account disabled. Contact support.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    // Return user data without password
    const userSafe = user.toJSON();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userSafe,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * protected - returns current user
 */
exports.me = async (req, res, next) => {
  try {
    // auth middleware attaches req.user (id, role)
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * client should discard token; server can implement blacklist if needed
 */
exports.logout = async (req, res) => {
  // Stateless JWT — logout handled client-side; respond successful
  res.status(200).json({ success: true, message: 'Logout successful' });
};