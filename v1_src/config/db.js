const mongoose = require('mongoose');
const logger = require('../utils/logger'); // optional winston logger (example below)

const connectWithRetry = async (mongoUri, options = {}) => {
  const defaultOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // prefer IPv4
    ...options,
  };

  mongoose.set('strictQuery', true);

  const connect = async () => {
    try {
      await mongoose.connect(mongoUri, defaultOpts);
      logger.info('MongoDB connected');
      // Ensure indexes (recommended to call model.ensureIndexes() per model in bootstrap if needed)
    } catch (err) {
      logger.error(`MongoDB connection error: ${err.message}`);
      // Retry with exponential backoff
      const retrySecs = 5;
      logger.info(`Retrying MongoDB connection in ${retrySecs}s ...`);
      await new Promise((r) => setTimeout(r, retrySecs * 1000));
      return connect();
    }
  };

  await connect();

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  // Optional: graceful close
  const close = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  };

  return { mongoose, close };
};

module.exports = connectWithRetry;