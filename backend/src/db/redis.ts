import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  },
});

export const redisSub = new Redis(env.REDIS_URL);
export const redisPub = new Redis(env.REDIS_URL);

redis.on('connect', () => {
  console.log('[REDIS] Connected successfully to Redis cluster/instance');
});

redis.on('error', (err) => {
  console.error('[REDIS ERROR]', err);
});
