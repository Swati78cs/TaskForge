const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`================================================`);
      console.log(`🚀 TaskForge API Server running on port ${env.PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`================================================`);
    });

    let workerInstance = null;
    if (env.RUN_WORKER_IN_SERVER) {
      const { createWorker } = require('./workers/jobWorker');
      workerInstance = createWorker();
      console.log(`[Server] In-process worker active [ID: ${workerInstance.workerId}]`);
    }

    if (env.RUN_SCHEDULER_IN_SERVER) {
      const { startSchedulerEngine, stopSchedulerEngine } = require('./scheduler/schedulerEngine');
      startSchedulerEngine();
      console.log(`[Server] In-process scheduler active`);
    }

    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] ${signal} signal received. Closing HTTP server...`);
      if (workerInstance) {
        try {
          await workerInstance.stop();
        } catch (e) {
          console.error('[Server] Error stopping worker:', e.message);
        }
      }
      if (env.RUN_SCHEDULER_IN_SERVER) {
        try {
          const { stopSchedulerEngine } = require('./scheduler/schedulerEngine');
          stopSchedulerEngine();
        } catch (e) {
          console.error('[Server] Error stopping scheduler:', e.message);
        }
      }
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;
