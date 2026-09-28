const { z } = require('zod');
const JobService = require('../services/jobService');
const { enqueueJob } = require('../queues/jobQueue');
const { ApiResponse, ApiError } = require('../utils/response');

const createJobSchema = z.object({
  type: z.enum(['send_email', 'generate_pdf', 'process_image', 'api_request'], {
    errorMap: () => ({ message: 'Invalid job type. Supported: send_email, generate_pdf, process_image, api_request' }),
  }),
  payload: z.record(z.any()).default({}),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional().default('NORMAL'),
  maxAttempts: z.number().int().min(1).max(10).optional().default(3),
  idempotencyKey: z.string().max(128).optional(),
  scheduledAt: z.string().datetime().or(z.date()).optional(),
});

// We will export queue enqueue helper hook for queue integration
let queueJobHook = enqueueJob;
const setQueueJobHook = (hook) => {
  queueJobHook = hook;
};

const createJob = async (req, res, next) => {
  try {
    const validated = createJobSchema.parse(req.body);
    const { job, isDuplicate } = await JobService.createJob(req.user._id, validated);

    if (isDuplicate) {
      return ApiResponse.success(res, job, 'Job already exists (idempotent submission)', 200);
    }

    // Queue submission (Phase 4 integration hook)
    if (queueJobHook) {
      try {
        await queueJobHook(job);
      } catch (queueErr) {
        // Dual-write failure handling: section 10
        job.status = 'FAILED';
        job.lastError = `Queue submission failed: ${queueErr.message}`;
        await job.save();
        throw new ApiError(500, `Failed to enqueue job: ${queueErr.message}`, null, 'QUEUE_ENQUEUE_FAILED');
      }
    }

    return ApiResponse.success(res, job, 'Job submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getJobs = async (req, res, next) => {
  try {
    const result = await JobService.getJobs(req.user, req.query);
    return ApiResponse.success(res, result, 'Jobs fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getJobById = async (req, res, next) => {
  try {
    const job = await JobService.getJobById(req.params.id, req.user);
    return ApiResponse.success(res, job, 'Job details fetched successfully');
  } catch (error) {
    next(error);
  }
};

const cancelJob = async (req, res, next) => {
  try {
    const job = await JobService.cancelJob(req.params.id, req.user);
    return ApiResponse.success(res, job, 'Job cancelled successfully');
  } catch (error) {
    next(error);
  }
};

const retryJob = async (req, res, next) => {
  try {
    const job = await JobService.retryJob(req.params.id, req.user);

    if (queueJobHook) {
      await queueJobHook(job);
    }

    return ApiResponse.success(res, job, 'Job queued for retry successfully');
  } catch (error) {
    next(error);
  }
};

const getJobLogs = async (req, res, next) => {
  try {
    const logs = await JobService.getJobLogs(req.params.id, req.user);
    return ApiResponse.success(res, logs, 'Job logs fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  cancelJob,
  retryJob,
  getJobLogs,
  setQueueJobHook,
};
