import { Server, Socket } from 'socket.io';
import dialogueOrchestrator from '../services/dialogueOrchestrator';
import logger from '../lib/logger';

export const initSocket = (io: Server): void => {
  logger.info('🔌 WebSockets: Initializing Socket.io handler...');

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 WebSockets: Client connected [ID: ${socket.id}]`);

    // Listen for real-time bot messages
    socket.on('bot_message', async (payload: { sessionId: string; text: string; userId?: string; tenantId?: string }, callback?: Function) => {
      try {
        const { sessionId, text, userId, tenantId } = payload;

        if (!sessionId || !text) {
          const errResponse = { success: false, message: 'Invalid payload. sessionId and text are required.' };
          if (callback) callback(errResponse);
          socket.emit('bot_error', errResponse);
          return;
        }

        logger.info(`🔌 WebSockets: Received "bot_message" on session "${sessionId}" from socket "${socket.id}"`);

        // Process message through conversational orchestrator
        const response = await dialogueOrchestrator.handleMessage(sessionId, text, userId, tenantId);

        const successResponse = {
          success: true,
          data: response,
        };

        // If callback is provided (RPC style), execute it
        if (callback) {
          callback(successResponse);
        }

        // Also emit back to the socket for async subscription pattern
        socket.emit('bot_response', successResponse);

      } catch (err: any) {
        logger.error(`🔌 WebSockets: Error handling "bot_message" on socket "${socket.id}":`, err.message);
        const errPayload = { success: false, message: err.message || 'Internal server error processing chat message' };
        if (callback) callback(errPayload);
        socket.emit('bot_error', errPayload);
      }
    });

    // Handle client disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 WebSockets: Client disconnected [ID: ${socket.id}], Reason: ${reason}`);
    });
  });
};
export default initSocket;
