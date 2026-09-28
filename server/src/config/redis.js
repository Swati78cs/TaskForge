const Redis = require('ioredis');
const env = require('./env');

const getRedisConnectionOptions = () => {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    skipVersionCheck: true,
    retryStrategy: (times) => {
      // Exponential backoff for redis reconnection attempts
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  };
};

const createRedisClient = () => {
  const client = new Redis(getRedisConnectionOptions());
  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[Redis] Connection Error:', err.message);
    }
  });
  client.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Redis] Connected successfully');
    }
  });
  return client;
};

module.exports = {
  getRedisConnectionOptions,
  createRedisClient,
};
