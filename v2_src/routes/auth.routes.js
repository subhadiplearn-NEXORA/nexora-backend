/**
 * src/routes/auth.routes.js
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.post(
  '/auth/register',
  validate([body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })]),
  authController.register
);

router.post('/auth/login', validate([body('email').isEmail(), body('password').exists()]), authController.login);
router.post('/auth/logout', protect, authController.logout);
router.get('/auth/me', protect, authController.me);

module.exports = router;