const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables (.env.production takes precedence if present, then .env)
const envFiles = [
  path.join(__dirname, '../../../.env.production'),
  path.join(__dirname, '../../.env.production'),
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../../.env'),
];

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
  }
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskforge',
  REDIS_URL: process.env.REDIS_URL || undefined,
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  JWT_SECRET: process.env.JWT_SECRET || 'taskforge_default_secret_key_32_chars_min',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'taskforge_default_refresh_secret_key_32_chars_min',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  LOCK_DURATION: parseInt(process.env.LOCK_DURATION || '30000', 10),
  RESEND_API_KEY: process.env.RESEND_API_KEY || 're_mock_key',
  EMAIL_FROM: process.env.EMAIL_FROM || 'TaskForge <onboarding@resend.dev>',
  RUN_WORKER_IN_SERVER: process.env.RUN_WORKER_IN_SERVER === 'true',
  RUN_SCHEDULER_IN_SERVER: process.env.RUN_SCHEDULER_IN_SERVER === 'true',
};
