import getRedisClient from '../../redis';
import ConversationModel from '../../models/Conversation';
import logger from '../../lib/logger';
import { Types } from 'mongoose';

export interface IDialogueContext {
  name: string;
  lifespan: number;
  parameters: Record<string, any>;
}

export interface IDialogueState {
  sessionId: string;
  activeFlow?: string;
  currentIntent?: string;
  waitingFor?: string;
  slots: Record<string, any>;
  contexts: IDialogueContext[];
  lastUpdated: number;
}

export class DialogueStateTracker {
  private SESSION_TTL = 1800; // 30 minutes in seconds

  constructor() {}

  /**
   * Generates a fresh, empty dialogue state structure
   */
  private createNewState(sessionId: string): IDialogueState {
    return {
      sessionId,
      slots: {},
      contexts: [],
      lastUpdated: Date.now(),
    };
  }

  /**
   * Load dialogue state from Redis, fallback to MongoDB if missing/failed
   */
  public async load(sessionId: string, tenantId: Types.ObjectId): Promise<IDialogueState> {
    const redis = getRedisClient();
    const redisKey = `session:${tenantId.toString()}:${sessionId}`;

    try {
      // 1. Try Redis First
      const cached = await redis.get(redisKey);
      if (cached) {
        return JSON.parse(cached) as IDialogueState;
      }
    } catch (err: any) {
      logger.error(`StateTracker: Redis fetch failed for ${sessionId}:`, err.message);
    }

    // 2. Fallback to MongoDB
    try {
      const conv = await ConversationModel.findBySessionId(sessionId, tenantId);
      if (conv) {
        const state: IDialogueState = {
          sessionId: conv.sessionId,
          activeFlow: conv.activeFlow || undefined,
          currentIntent: conv.currentIntent || undefined,
          waitingFor: conv.waitingFor || undefined,
          slots: conv.slots || {},
          contexts: conv.contexts.map((c) => ({
            name: c.name,
            lifespan: c.lifespan,
            parameters: c.parameters || {},
          })),
          lastUpdated: conv.updatedAt.getTime(),
        };

        // Cache back to Redis in background
        this.cacheToRedis(state, tenantId).catch((e) =>
          logger.error('StateTracker: Background Redis caching failed', e.message)
        );

        return state;
      }
    } catch (err: any) {
      logger.error(`StateTracker: MongoDB fetch failed for ${sessionId}:`, err.message);
    }

    // 3. If new session, return blank state
    return this.createNewState(sessionId);
  }

  /**
   * Save dialogue state to Redis and synchronize to MongoDB asynchronously
   */
  public async save(sessionId: string, state: IDialogueState, tenantId: Types.ObjectId): Promise<void> {
    state.lastUpdated = Date.now();

    // 1. Cache to Redis
    await this.cacheToRedis(state, tenantId);

    // 2. Async Sync to MongoDB
    this.syncToMongo(state, tenantId).catch((err) => {
      logger.error(`StateTracker: MongoDB sync failed for ${sessionId}:`, err.message);
    });
  }

  /**
   * Clear session state from both stores
   */
  public async clear(sessionId: string, tenantId: Types.ObjectId): Promise<void> {
    const redis = getRedisClient();
    const redisKey = `session:${tenantId.toString()}:${sessionId}`;

    try {
      await redis.del(redisKey);
    } catch (err: any) {
      logger.error(`StateTracker: Redis clear failed:`, err.message);
    }

    try {
      await ConversationModel.deleteOne({ sessionId, tenantId });
    } catch (err: any) {
      logger.error(`StateTracker: MongoDB delete failed:`, err.message);
    }
  }

  /**
   * Helper to write state to Redis cache
   */
  private async cacheToRedis(state: IDialogueState, tenantId: Types.ObjectId): Promise<void> {
    try {
      const redis = getRedisClient();
      const redisKey = `session:${tenantId.toString()}:${state.sessionId}`;
      await redis.set(redisKey, JSON.stringify(state), 'EX', this.SESSION_TTL);
    } catch (err: any) {
      logger.error('StateTracker: Failed saving state to Redis:', err.message);
    }
  }

  /**
   * Helper to write state to MongoDB persistence
   */
  private async syncToMongo(state: IDialogueState, tenantId: Types.ObjectId): Promise<void> {
    await ConversationModel.findOneAndUpdate(
      { sessionId: state.sessionId, tenantId },
      {
        sessionId: state.sessionId,
        tenantId,
        activeFlow: state.activeFlow || null,
        currentIntent: state.currentIntent || null,
        waitingFor: state.waitingFor || null,
        slots: state.slots,
        contexts: state.contexts,
      },
      { upsert: true, new: true }
    );
  }
}

export default new DialogueStateTracker();
