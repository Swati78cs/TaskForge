const Job = require('../models/Job');
const { ApiError } = require('../utils/response');

class JobService {
  /**
   * Create a new job document in MongoDB.
   * Handles idempotency: if idempotencyKey exists, returns existing job.
   */
  static async createJob(userId, jobData) {
    const { type, payload, priority, maxAttempts, idempotencyKey, scheduledAt } = jobData;

    if (idempotencyKey) {
      const existingJob = await Job.findOne({ idempotencyKey });
      if (existingJob) {
        return { job: existingJob, isDuplicate: true };
      }
    }

    try {
      const job = await Job.create({
        userId,
        type,
        payload: payload || {},
        priority: priority || 'NORMAL',
        maxAttempts: maxAttempts !== undefined ? maxAttempts : 3,
        idempotencyKey: idempotencyKey || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: 'PENDING',
      });

      return { job, isDuplicate: false };
    } catch (error) {
      if (error.code === 11000 && idempotencyKey) {
        const existingJob = await Job.findOne({ idempotencyKey });
        if (existingJob) {
          return { job: existingJob, isDuplicate: true };
        }
      }
      throw error;
    }
  }

  /**
   * Get paginated list of jobs for a user (or all if admin)
   */
  static async getJobs(user, queryParams) {
    const { page = 1, limit = 20, status, type, priority, sort = '-createdAt' } = queryParams;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (user.role !== 'ADMIN') {
      filter.userId = user._id;
    }
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email role');

    return {
      jobs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get job by ID with ownership check
   */
  static async getJobById(jobId, user) {
    const job = await Job.findById(jobId).populate('userId', 'name email role');
    if (!job) {
      throw new ApiError(404, 'Job not found', null, 'JOB_NOT_FOUND');
    }

    if (user.role !== 'ADMIN' && job.userId._id.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Access denied to this job', null, 'FORBIDDEN');
    }

    return job;
  }

  /**
   * Cancel a job (only if PENDING or QUEUED)
   */
  static async cancelJob(jobId, user) {
    const job = await JobService.getJobById(jobId, user);

    if (!['PENDING', 'QUEUED'].includes(job.status)) {
      throw new ApiError(
        400,
        `Cannot cancel job in '${job.status}' status. Only PENDING or QUEUED jobs can be cancelled.`,
        null,
        'INVALID_STATE_TRANSITION'
      );
    }

    job.status = 'CANCELLED';
    await job.save();

    return job;
  }

  /**
   * Mark a job for retry (only valid from FAILED or DEAD_LETTER)
   */
  static async retryJob(jobId, user) {
    const job = await JobService.getJobById(jobId, user);

    if (!['FAILED', 'DEAD_LETTER'].includes(job.status)) {
      throw new ApiError(
        400,
        `Cannot retry job in '${job.status}' status. Only FAILED or DEAD_LETTER jobs can be retried.`,
        null,
        'INVALID_STATE_TRANSITION'
      );
    }

    job.status = 'RETRYING';
    await job.save();

    return job;
  }

  /**
   * Get job execution logs (attempt history)
   */
  static async getJobLogs(jobId, user) {
    const job = await JobService.getJobById(jobId, user);
    return {
      jobId: job._id,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: job.lastError,
      attemptHistory: job.attemptHistory,
    };
  }
}

module.exports = JobService;
