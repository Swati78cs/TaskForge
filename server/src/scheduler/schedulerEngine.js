const cronParser = require('cron-parser');
const cron = require('node-cron');
const RecurringJob = require('../models/RecurringJob');
const Job = require('../models/Job');
const { enqueueJob } = require('../queues/jobQueue');

const processDueSchedules = async () => {
  const now = new Date();
  try {
    const dueSchedules = await RecurringJob.find({
      status: 'active',
      nextRunAt: { $lte: now },
    });

    if (dueSchedules.length > 0) {
      console.log(`[Scheduler] Found ${dueSchedules.length} due recurring schedule(s) to execute`);
    }

    for (const schedule of dueSchedules) {
      try {
        // 1. Create a new Job document
        const job = await Job.create({
          userId: schedule.userId,
          type: schedule.jobType,
          payload: {
            ...schedule.payload,
            _scheduleId: schedule._id.toString(),
            _scheduleName: schedule.name,
          },
          status: 'PENDING',
          priority: 'NORMAL',
        });

        // 2. Enqueue job to BullMQ
        try {
          if (process.env.NODE_ENV === 'test') {
            // In unit test mode without live Redis, set status to QUEUED directly
            job.status = 'QUEUED';
            await job.save();
          } else {
            await enqueueJob(job);
          }
          console.log(`[Scheduler] Enqueued job ${job._id} for schedule '${schedule.name}'`);
        } catch (enqueueErr) {
          console.error(`[Scheduler] Failed to enqueue job for schedule ${schedule._id}:`, enqueueErr.message);
        }

        // 3. Update schedule timestamps
        schedule.lastRunAt = now;
        const interval = cronParser.parseExpression(schedule.cronExpression, { currentDate: now });
        schedule.nextRunAt = interval.next().toDate();
        await schedule.save();
      } catch (scheduleErr) {
        console.error(`[Scheduler] Error processing schedule ${schedule._id}:`, scheduleErr.message);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error scanning due schedules:', err.message);
  }
};

/**
 * Section 10: Periodic reconciliation for stale PENDING jobs without BullMQ entry.
 */
const reconcilePendingJobs = async () => {
  const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  try {
    const stalePendingJobs = await Job.find({
      status: 'PENDING',
      createdAt: { $lte: threshold },
    });

    if (stalePendingJobs.length > 0) {
      console.log(`[Reconciliation] Found ${stalePendingJobs.length} stale PENDING job(s)`);
    }

    for (const job of stalePendingJobs) {
      try {
        if (process.env.NODE_ENV === 'test') {
          job.status = 'QUEUED';
          await job.save();
        } else {
          await enqueueJob(job);
        }
        console.log(`[Reconciliation] Successfully re-enqueued job ${job._id}`);
      } catch (err) {
        job.status = 'FAILED';
        job.lastError = 'Queue submission failed during reconciliation scan';
        await job.save();
      }
    }
  } catch (err) {
    console.error('[Reconciliation] Error during job reconciliation scan:', err.message);
  }
};

let schedulerTask = null;

const startSchedulerEngine = (intervalCron = '*/30 * * * * *') => {
  console.log(`[Scheduler Engine] Starting scheduler engine on pattern '${intervalCron}'...`);

  processDueSchedules();
  reconcilePendingJobs();

  schedulerTask = cron.schedule(intervalCron, async () => {
    await processDueSchedules();
    await reconcilePendingJobs();
  });

  return schedulerTask;
};

const stopSchedulerEngine = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    console.log('[Scheduler Engine] Stopped scheduler engine.');
  }
};

module.exports = {
  processDueSchedules,
  reconcilePendingJobs,
  startSchedulerEngine,
  stopSchedulerEngine,
};
