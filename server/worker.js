const { connectDB } = require('./src/config/db');
const { createWorker } = require('./src/workers/jobWorker');
const env = require('./src/config/env');

const startWorkerProcess = async () => {
  try {
    console.log(`[Worker Process] Initializing worker process...`);
    await connectDB();

    const workerInstance = createWorker();
    console.log(`================================================`);
    console.log(`🚀 TaskForge Worker Process running [ID: ${workerInstance.workerId}]`);
    console.log(`⚡ Concurrency: ${env.WORKER_CONCURRENCY || 5}`);
    console.log(`================================================`);

    const shutdown = async (signal) => {
      console.log(`\n[Worker Process] ${signal} received. Shutting down worker...`);
      await workerInstance.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Worker Process] Startup error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startWorkerProcess();
}

module.exports = startWorkerProcess;
