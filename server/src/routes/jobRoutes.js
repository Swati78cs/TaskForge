const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  createJob,
  getJobs,
  getJobById,
  cancelJob,
  retryJob,
  getJobLogs,
} = require('../controllers/jobController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const jobSubmitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 job creations per minute per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded for job submissions, try again later',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});

router.use(authenticate);

router.post('/', jobSubmitLimiter, createJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.delete('/:id', cancelJob);
router.post('/:id/retry', retryJob);
router.get('/:id/logs', getJobLogs);

module.exports = router;
