const { Queue } = require('bullmq');
const { getRedisConnectionOptions } = require('../config/redis');
const Job = require('../models/Job');

const QUEUE_NAME = 'taskforge-jobs';

const priorityMap = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

let jobQueue = null;

const getJobQueue = () => {
  if (!jobQueue) {
    jobQueue = new Queue(QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      },
    });
  }
  return jobQueue;
};

/**
 * Enqueues a MongoDB job to BullMQ.
 * Handles dual-write failure: if BullMQ enqueue fails, updates MongoDB status to 'FAILED'.
 */
const enqueueJob = async (mongoJob) => {
  if (process.env.NODE_ENV === 'test') {
    mongoJob.status = 'QUEUED';
    await mongoJob.save();
    return mongoJob;
  }

  const priorityValue = priorityMap[mongoJob.priority] || 3;
  let delay = 0;

  if (mongoJob.scheduledAt && new Date(mongoJob.scheduledAt) > new Date()) {
    delay = new Date(mongoJob.scheduledAt).getTime() - Date.now();
  }

  const bullJobOptions = {
    jobId: mongoJob._id.toString(),
    priority: priorityValue,
    delay: Math.max(0, delay),
    attempts: mongoJob.maxAttempts,
  };

  try {
    const queue = getJobQueue();
    await queue.add(mongoJob.type, { mongoJobId: mongoJob._id.toString() }, bullJobOptions);

    mongoJob.status = 'QUEUED';
    await mongoJob.save();
    return mongoJob;
  } catch (error) {
    console.error(`[Queue] Dual-write failure: BullMQ enqueue failed for job ${mongoJob._id}:`, error.message);
    mongoJob.status = 'FAILED';
    mongoJob.lastError = `Queue submission failed: ${error.message}`;
    await mongoJob.save();
    throw error;
  }
};

module.exports = {
  QUEUE_NAME,
  getJobQueue,
  enqueueJob,
  priorityMap,
};
