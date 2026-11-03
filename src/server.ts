import http from 'http';
import { Server } from 'socket.io';
import app, { isOriginAllowed } from './app';
import config from './config';
import { connectToDatabase, disconnectFromDatabase } from './lib/mongoose';
import logger from './lib/logger';
import { startScheduler, stopScheduler } from './lib/scheduler';
import dialogueOrchestrator from './services/dialogueOrchestrator';
import initSocket from './api/socketHandler';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Bind socket handlers
initSocket(io);

/**
 * ========= START SERVER =========
 */
(async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Initialize & pre-train dialogue engine (load intents, entities, flows)
    await dialogueOrchestrator.initialize();

    // Start background scheduler
    startScheduler();

    // Start server
    server.listen(config.PORT, () => {
      logger.info(`🚀 API Server running on port ${config.PORT}`);
      logger.info(`📱 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API Base URL: http://localhost:${config.PORT}/api/v1`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server', err);
    process.exit(1);
  }
})();

/**
 * ========= GRACEFUL SHUTDOWN =========
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  stopScheduler();
  await disconnectFromDatabase();
  server.close(() => {
    logger.info('Server closed. Process terminating.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  stopScheduler();
  await disconnectFromDatabase();
  server.close(() => {
    logger.info('Server closed. Process terminating.');
    process.exit(0);
  });
});
