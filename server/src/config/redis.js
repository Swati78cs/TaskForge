const Redis = require('ioredis');
const env = require('./env');

const parseRedisUrl = (redisUrl) => {
  try {
    const parsed = new URL(redisUrl);
    const isTls = parsed.protocol === 'rediss:';
    const options = {
      host: parsed.hostname,
      port: parseInt(parsed.port || (isTls ? '6380' : '6379'), 10),
    };
    if (parsed.username) {
      options.username = decodeURIComponent(parsed.username);
    }
    if (parsed.password) {
      options.password = decodeURIComponent(parsed.password);
    }
    if (isTls) {
      options.tls = {
        rejectUnauthorized: false,
      };
    }
    return options;
  } catch (err) {
    console.error('[Redis] Failed to parse REDIS_URL:', err.message);
    return null;
  }
};

const getRedisConnectionOptions = () => {
  const baseOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    skipVersionCheck: true,
    retryStrategy: (times) => {
      // Exponential backoff for redis reconnection attempts
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  };

  if (env.REDIS_URL) {
    const parsed = parseRedisUrl(env.REDIS_URL);
    if (parsed) {
      return {
        ...baseOptions,
        ...parsed,
      };
    }
  }

  return {
    ...baseOptions,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
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
