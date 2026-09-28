const { connectDB } = require('./src/config/db');
const { startSchedulerEngine, stopSchedulerEngine } = require('./src/scheduler/schedulerEngine');

const startSchedulerProcess = async () => {
  try {
    console.log(`[Scheduler Process] Initializing scheduler process...`);
    await connectDB();

    startSchedulerEngine();

    console.log(`================================================`);
    console.log(`🚀 TaskForge Dedicated Scheduler Process running`);
    console.log(`================================================`);

    const shutdown = async (signal) => {
      console.log(`\n[Scheduler Process] ${signal} received. Shutting down scheduler...`);
      stopSchedulerEngine();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Scheduler Process] Startup error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startSchedulerProcess();
}

module.exports = startSchedulerProcess;
