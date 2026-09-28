const { Worker } = require('bullmq');
const os = require('os');
const { QUEUE_NAME } = require('../queues/jobQueue');
const { getRedisConnectionOptions } = require('../config/redis');
const Job = require('../models/Job');
const WorkerModel = require('../models/Worker');
const { getHandler } = require('../handlers');
const env = require('../config/env');

const createWorker = (workerIdOverride = null) => {
  const workerId = workerIdOverride || `worker-${os.hostname()}-${process.pid}`;
  const concurrency = env.WORKER_CONCURRENCY || 5;
  const lockDuration = env.LOCK_DURATION || 30000;

  let heartbeatInterval = null;

  const startHeartbeat = () => {
    const sendHeartbeat = async () => {
      try {
        await WorkerModel.findOneAndUpdate(
          { workerId },
          {
            $set: {
              status: 'ONLINE',
              lastHeartbeat: new Date(),
              concurrency,
            },
            $setOnInsert: {
              startedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error(`[Worker ${workerId}] Heartbeat update failed:`, err.message);
      }
    };

    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, 10000); // Heartbeat every 10s
  };

  const stopHeartbeat = async () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    try {
      await WorkerModel.findOneAndUpdate({ workerId }, { status: 'OFFLINE' });
    } catch (err) {
      console.error(`[Worker ${workerId}] Failed to mark offline:`, err.message);
    }
  };

  startHeartbeat();

  const bullWorker = new Worker(
    QUEUE_NAME,
    async (bullJob) => {
      const { mongoJobId } = bullJob.data;
      const mongoJob = await Job.findById(mongoJobId);

      if (!mongoJob) {
        console.error(`[Worker ${workerId}] MongoDB Job ${mongoJobId} not found`);
        return;
      }

      // Check if job was cancelled prior to execution
      if (mongoJob.status === 'CANCELLED') {
        console.log(`[Worker ${workerId}] Job ${mongoJobId} was cancelled. Skipping.`);
        return;
      }

      const attemptNum = mongoJob.attempts + 1;
      const startedAt = new Date();

      mongoJob.status = 'PROCESSING';
      mongoJob.attempts = attemptNum;
      if (!mongoJob.startedAt) mongoJob.startedAt = startedAt;

      const attemptRecord = {
        attemptNumber: attemptNum,
        workerId,
        status: 'PROCESSING',
        startedAt,
      };

      mongoJob.attemptHistory.push(attemptRecord);
      await mongoJob.save();

      try {
        const handler = getHandler(mongoJob.type);
        const result = await handler(mongoJob.payload, mongoJob);

        const completedAt = new Date();
        const duration = completedAt.getTime() - startedAt.getTime();

        mongoJob.status = 'SUCCESS';
        mongoJob.completedAt = completedAt;
        mongoJob.lastError = undefined;

        // Update current attempt in history
        const lastAttempt = mongoJob.attemptHistory[mongoJob.attemptHistory.length - 1];
        if (lastAttempt) {
          lastAttempt.status = 'SUCCESS';
          lastAttempt.completedAt = completedAt;
          lastAttempt.duration = duration;
        }

        await mongoJob.save();
        await WorkerModel.findOneAndUpdate({ workerId }, { $inc: { jobsProcessed: 1 } });

        return result;
      } catch (handlerErr) {
        const completedAt = new Date();
        const duration = completedAt.getTime() - startedAt.getTime();
        const errorMsg = handlerErr.message || 'Job handler execution failed';

        mongoJob.lastError = errorMsg;

        const lastAttempt = mongoJob.attemptHistory[mongoJob.attemptHistory.length - 1];
        if (lastAttempt) {
          lastAttempt.status = 'FAILED';
          lastAttempt.error = errorMsg;
          lastAttempt.completedAt = completedAt;
          lastAttempt.duration = duration;
        }

        if (mongoJob.attempts >= mongoJob.maxAttempts) {
          mongoJob.status = 'DEAD_LETTER';
          mongoJob.completedAt = completedAt;
          console.log(`[Worker ${workerId}] Job ${mongoJobId} reached max attempts (${mongoJob.maxAttempts}). Moved to DEAD_LETTER.`);
        } else {
          mongoJob.status = 'FAILED';
          console.log(`[Worker ${workerId}] Job ${mongoJobId} attempt ${attemptNum} failed: ${errorMsg}. Scheduled for retry.`);
        }

        await mongoJob.save();
        await WorkerModel.findOneAndUpdate({ workerId }, { $inc: { jobsFailed: 1 } });

        throw handlerErr;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency,
      lockDuration,
    }
  );

  bullWorker.on('completed', (job) => {
    console.log(`[Worker ${workerId}] Completed job ${job.id}`);
  });

  bullWorker.on('failed', (job, err) => {
    console.error(`[Worker ${workerId}] Job ${job ? job.id : 'unknown'} failed: ${err.message}`);
  });

  bullWorker.on('stalled', (jobId) => {
    console.warn(`[Worker ${workerId}] Stalled job detected: ${jobId}`);
  });

  return {
    workerId,
    bullWorker,
    stop: async () => {
      await stopHeartbeat();
      await bullWorker.close();
    },
  };
};

module.exports = {
  createWorker,
};
