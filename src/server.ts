import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import config from './config';
import { connectToDatabase, disconnectFromDatabase } from './lib/mongoose';
import logger from './lib/logger';
import { startScheduler, stopScheduler } from './lib/scheduler';
import dialogueOrchestrator from './services/dialogueOrchestrator';
import initSocket from './api/socketHandler';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
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
const shutdown = async () => {
  try {
    stopScheduler();
    await disconnectFromDatabase();
    logger.warn('🛑 Server shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown error', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);



