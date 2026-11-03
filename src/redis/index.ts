import Redis from 'ioredis';
import config from '../config';
import logger from '../lib/logger';

interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expiryMode?: 'EX', time?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  quit(): Promise<void>;
  isFallback: boolean;
}

class InMemoryRedis implements IRedisClient {
  private store = new Map<string, { value: string; expiry: number | null }>();
  public isFallback = true;

  constructor() {
    logger.warn('⚠️ Redis not available. Falling back to In-Memory Session Storage.');
  }

  async get(key: string): Promise<string | null> {
    const data = this.store.get(key);
    if (!data) return null;
    if (data.expiry && Date.now() > data.expiry) {
      this.store.delete(key);
      return null;
    }
    return data.value;
  }

  async set(key: string, value: string, expiryMode?: 'EX', time?: number): Promise<'OK' | null> {
    let expiry: number | null = null;
    if (expiryMode === 'EX' && time) {
      expiry = Date.now() + time * 1000;
    }
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

class RealRedis implements IRedisClient {
  private client: Redis;
  private fallback: InMemoryRedis | null = null;
  public isFallback = false;

  constructor() {
    this.client = new Redis(config.REDIS_URI, {
      maxRetriesPerRequest: 1,
      showFriendlyErrorStack: true,
      retryStrategy(times) {
        if (times > 2) {
          // stop retrying and trigger error to fallback
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });

    this.client.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
      if (!this.fallback) {
        this.fallback = new InMemoryRedis();
      }
    });

    this.client.on('connect', () => {
      logger.info('🔌 Redis connected successfully');
      this.fallback = null;
    });
  }

  private useInMemory(): boolean {
    return this.fallback !== null || this.client.status !== 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (this.useInMemory()) {
      if (!this.fallback) this.fallback = new InMemoryRedis();
      return this.fallback.get(key);
    }
    try {
      return await this.client.get(key);
    } catch (err: any) {
      logger.error('Redis get failed, falling back to in-memory:', err.message);
      if (!this.fallback) this.fallback = new InMemoryRedis();
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: string, expiryMode?: 'EX', time?: number): Promise<'OK' | null> {
    if (this.useInMemory()) {
      if (!this.fallback) this.fallback = new InMemoryRedis();
      return this.fallback.set(key, value, expiryMode, time);
    }
    try {
      if (expiryMode === 'EX' && time) {
        return await this.client.set(key, value, 'EX', time);
      }
      return await this.client.set(key, value);
    } catch (err: any) {
      logger.error('Redis set failed, falling back to in-memory:', err.message);
      if (!this.fallback) this.fallback = new InMemoryRedis();
      return this.fallback.set(key, value, expiryMode, time);
    }
  }

  async del(key: string): Promise<number> {
    if (this.useInMemory()) {
      if (!this.fallback) this.fallback = new InMemoryRedis();
      return this.fallback.del(key);
    }
    try {
      return await this.client.del(key);
    } catch (err: any) {
      logger.error('Redis del failed, falling back to in-memory:', err.message);
      if (!this.fallback) this.fallback = new InMemoryRedis();
      return this.fallback.del(key);
    }
  }

  async quit(): Promise<void> {
    if (this.fallback) {
      await this.fallback.quit();
    }
    try {
      await this.client.quit();
    } catch (err) {}
  }
}

let redisClient: IRedisClient;

try {
  redisClient = new RealRedis();
} catch (error) {
  redisClient = new InMemoryRedis();
}

// Global exception handling/fallback trigger for runtime connection failures
const getClient = (): IRedisClient => {
  return redisClient;
};

export default getClient;
export { IRedisClient };
