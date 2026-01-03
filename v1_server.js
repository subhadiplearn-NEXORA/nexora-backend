require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectWithRetry = require('./src/config/db');
const logger = require('./src/utils/logger'); // simple winston logger

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) {
      logger.error('MONGO_URI is not set. Exiting.');
      process.exit(1);
    }

    // Connect to MongoDB
    const { mongoose } = await connectWithRetry(MONGO_URI);

    // Create HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`NEXORA backend running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      try {
        logger.info(`Received ${signal}. Closing server and MongoDB connection...`);
        server.close(async (err) => {
          if (err) {
            logger.error('Error closing server', err);
            process.exit(1);
          }
          try {
            await mongoose.connection.close(false);
            logger.info('MongoDB connection closed.');
            process.exit(0);
          } catch (e) {
            logger.error('Error during MongoDB shutdown', e);
            process.exit(1);
          }
        });
      } catch (e) {
        logger.error('Error during shutdown', e);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', err);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, p) => {
      logger.error('Unhandled Rejection at Promise', p, 'reason:', reason);
    });
  } catch (err) {
    logger.error('Server startup error:', err);
    process.exit(1);
  }
})();