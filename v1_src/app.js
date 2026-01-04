/**
 * src/app.js
 * Express app configuration, middlewares, route registration, versioning, error handling
 */
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const createCorsMiddleware = require('./middlewares/cors.middleware');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();

// Basic middlewares
app.use(helmet());
app.use(createCorsMiddleware());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NEXORA backend running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) =>
  res.status(200).json({ success: true, message: 'NEXORA API is healthy' })
);

app.get('/api/v1/health', (req, res) =>
  res.status(200).json({ success: true, message: 'NEXORA API v1 is healthy' })
);

// Routes
const authRoutes = require('./routes/auth.routes');
const sellerRoutes = require('./routes/seller.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');

const API_BASE = '/api';
const API_V1 = '/api/v1';

app.use(API_BASE, authRoutes);
app.use(API_BASE, sellerRoutes);
app.use(API_BASE, productRoutes);
app.use(API_BASE, orderRoutes);
app.use(API_BASE, paymentRoutes);
app.use(API_BASE, adminRoutes);

app.use(API_V1, authRoutes);
app.use(API_V1, sellerRoutes);
app.use(API_V1, productRoutes);
app.use(API_V1, orderRoutes);
app.use(API_V1, paymentRoutes);
app.use(API_V1, adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// 🔥 THIS IS THE IMPORTANT PART (NEW)
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(🚀 NEXORA backend running on port ${PORT});
});
