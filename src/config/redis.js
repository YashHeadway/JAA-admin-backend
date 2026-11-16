import { Redis } from '@upstash/redis';
import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * In-Memory Fallback Cache.
 * Used when Upstash / Redis is not configured or temporarily unreachable,
 * guaranteeing zero downtime and complete fail-open resilience.
 */
class InMemoryCacheFallback {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, options = {}) {
    const ttlSeconds = options.ex || options.EX || options.ttl || null;
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys) {
    let deleted = 0;
    for (const key of keys) {
      if (Array.isArray(key)) {
        for (const k of key) {
          if (this.store.delete(k)) deleted++;
        }
      } else {
        if (this.store.delete(key)) deleted++;
      }
    }
    return deleted;
  }

  async keys(pattern = '*') {
    const now = Date.now();
    // Clean expired keys
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt && now > v.expiresAt) {
        this.store.delete(k);
      }
    }

    if (pattern === '*' || !pattern) {
      return Array.from(this.store.keys());
    }

    // Convert glob pattern (e.g. "members:*") to RegExp
    const regexStr = '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    const regex = new RegExp(regexStr);
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async flushall() {
    this.store.clear();
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }
}

/**
 * Unified Redis Client Wrapper.
 * Prioritizes Upstash Redis REST API (optimal for Render / serverless),
 * falls back to TCP REDIS_URL, and gracefully defaults to in-memory fallback.
 */
class RedisClientManager {
  constructor() {
    this.client = null;
    this.provider = 'none'; // 'upstash' | 'tcp' | 'memory-fallback'
    this.isConnected = false;
    this.fallback = new InMemoryCacheFallback();
    this.init();
  }

  init() {
    if (!env.REDIS_CACHE_ENABLED) {
      logger.info('Redis cache is disabled via REDIS_CACHE_ENABLED=false. Using in-memory fallback.');
      this.provider = 'memory-fallback';
      this.client = this.fallback;
      return;
    }

    // 1. Check for Upstash Redis REST credentials (Recommended for Render)
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.client = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.provider = 'upstash';
        this.isConnected = true;
        logger.info('Connected to Upstash Redis via REST API');
        return;
      } catch (err) {
        logger.warn(`Failed to initialize Upstash Redis: ${err.message}. Switching to fallback.`);
      }
    }

    // 2. Check for TCP / TLS connection string (REDIS_URL / rediss://...)
    if (env.REDIS_URL) {
      try {
        const tcpClient = createClient({
          url: env.REDIS_URL,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 3) {
                logger.warn('Redis TCP reconnect attempts exceeded limit. Using memory fallback.');
                return false;
              }
              return Math.min(retries * 500, 3000);
            },
          },
        });

        tcpClient.on('error', (err) => {
          logger.warn(`Redis TCP error: ${err.message}`);
          this.isConnected = false;
        });

        tcpClient.on('connect', () => {
          this.isConnected = true;
          logger.info('Connected to Redis via TCP socket');
        });

        tcpClient.connect().catch((err) => {
          logger.warn(`Initial Redis TCP connect failed: ${err.message}. Using memory fallback.`);
          this.isConnected = false;
        });

        this.client = tcpClient;
        this.provider = 'tcp';
        return;
      } catch (err) {
        logger.warn(`Failed to initialize Redis TCP: ${err.message}. Using fallback.`);
      }
    }

    // 3. Fallback to In-Memory Cache
    logger.info('Upstash Redis credentials not detected in .env. Running with resilient In-Memory Cache fallback.');
    this.provider = 'memory-fallback';
    this.client = this.fallback;
    this.isConnected = true;
  }

  /**
   * Safe execution wrapper:
   * Tries primary client first; on failure, falls back to in-memory store so requests never fail.
   */
  async execute(fn) {
    if (this.provider === 'memory-fallback') {
      return fn(this.fallback);
    }

    try {
      return await fn(this.client);
    } catch (err) {
      logger.warn(`Redis operation failed (${err.message}). Using in-memory fallback.`);
      return fn(this.fallback);
    }
  }

  async get(key) {
    return this.execute(async (c) => {
      if (this.provider === 'tcp') {
        const raw = await c.get(key);
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return raw;
        }
      }
      return c.get(key);
    });
  }

  async set(key, value, options = {}) {
    return this.execute(async (c) => {
      const ttl = options.ex || options.EX || options.ttl || null;
      if (this.provider === 'tcp') {
        const payload = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (ttl) {
          return c.set(key, payload, { EX: ttl });
        }
        return c.set(key, payload);
      }
      // Upstash REST / Memory fallback: supports { ex: seconds }
      if (ttl) {
        return c.set(key, value, { ex: ttl });
      }
      return c.set(key, value);
    });
  }

  async del(...keys) {
    return this.execute(async (c) => {
      const flatKeys = keys.flat().filter(Boolean);
      if (flatKeys.length === 0) return 0;
      return c.del(...flatKeys);
    });
  }

  async keys(pattern = '*') {
    return this.execute(async (c) => {
      return c.keys(pattern);
    });
  }

  async flushall() {
    return this.execute(async (c) => {
      return c.flushall();
    });
  }

  async ping() {
    return this.execute(async (c) => {
      return c.ping();
    });
  }

  /**
   * Health status for diagnostics
   */
  async getStatus() {
    const start = Date.now();
    let pingResult = 'FAIL';
    let latencyMs = 0;
    try {
      pingResult = await this.ping();
      latencyMs = Date.now() - start;
    } catch {}

    const keyCount = (await this.keys('*')).length;

    return {
      connected: pingResult === 'PONG',
      provider: this.provider,
      latency: `${latencyMs}ms`,
      totalCachedKeys: keyCount,
      isFallback: this.provider === 'memory-fallback',
      message:
        this.provider === 'upstash'
          ? 'Connected to Upstash Redis (REST)'
          : this.provider === 'tcp'
          ? 'Connected to Redis Server (TCP)'
          : 'Running in resilient in-memory fallback mode (No Redis credentials in .env)',
    };
  }
}

export const redis = new RedisClientManager();
export default redis;
