/**
 * src/app.js
 * Express app configuration
 */

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const createCorsMiddleware = require("./middlewares/cors.middleware");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

/* ===============================
   BASIC MIDDLEWARES
================================ */
app.use(helmet());
app.use(createCorsMiddleware());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   LOGGING
================================ */
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* ===============================
   RATE LIMITING
================================ */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

/* ===============================
   HEALTH ROUTES
================================ */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NEXORA backend running 🚀",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API healthy" });
});

app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, message: "API v1 healthy" });
});

/* ===============================
   ROUTES (ENABLE ONLY IF EXISTS)
================================ */
app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/seller.routes"));
app.use("/api", require("./routes/product.routes"));
app.use("/api", require("./routes/order.routes"));
app.use("/api", require("./routes/payment.routes"));
app.use("/api", require("./routes/admin.routes"));

app.use("/api/v1", require("./routes/auth.routes"));
app.use("/api/v1", require("./routes/seller.routes"));
app.use("/api/v1", require("./routes/product.routes"));
app.use("/api/v1", require("./routes/order.routes"));
app.use("/api/v1", require("./routes/payment.routes"));
app.use("/api/v1", require("./routes/admin.routes"));

/* ===============================
   404
================================ */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/* ===============================
   ERROR HANDLER
================================ */
app.use(errorHandler);

module.exports = app;
