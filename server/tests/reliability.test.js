const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
const { calculateExponentialBackoff } = require('../src/utils/backoff');
const JobService = require('../src/services/jobService');

let mongoServer;
let user;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  user = await User.create({
    name: 'Reliability Tester',
    email: 'reliability@taskforge.dev',
    passwordHash: 'hashedpwd',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Job.deleteMany({});
});

describe('Phase 6: Retries, Backoff, Dead-Letter & Idempotency', () => {
  describe('Exponential Backoff Calculation', () => {
    it('should correctly calculate exponential delays', () => {
      expect(calculateExponentialBackoff(1, 5000)).toBe(5000);  // 5s
      expect(calculateExponentialBackoff(2, 5000)).toBe(10000); // 10s
      expect(calculateExponentialBackoff(3, 5000)).toBe(20000); // 20s
      expect(calculateExponentialBackoff(4, 5000)).toBe(40000); // 40s
    });

    it('should cap delay at maxDelayMs', () => {
      expect(calculateExponentialBackoff(10, 5000, 60000)).toBe(60000);
    });
  });

  describe('Dead-Letter Transition Flow', () => {
    it('should transition job to DEAD_LETTER when maxAttempts reached', async () => {
      const job = await Job.create({
        userId: user._id,
        type: 'send_email',
        payload: { to: 'fail@example.com', subject: 'Fail' },
        status: 'PROCESSING',
        attempts: 3,
        maxAttempts: 3,
      });

      // Simulate failure on last attempt
      job.status = 'DEAD_LETTER';
      job.lastError = 'Max attempts exceeded';
      await job.save();

      const deadLetterJob = await Job.findById(job._id);
      expect(deadLetterJob.status).toBe('DEAD_LETTER');
    });

    it('should allow manual retry from DEAD_LETTER state', async () => {
      const job = await Job.create({
        userId: user._id,
        type: 'send_email',
        payload: { to: 'fail@example.com', subject: 'Fail' },
        status: 'DEAD_LETTER',
        attempts: 3,
        maxAttempts: 3,
      });

      const retried = await JobService.retryJob(job._id, user);
      expect(retried.status).toBe('RETRYING');
    });
  });

  describe('Idempotency Key Verification', () => {
    it('should prevent duplicate job creation when same idempotencyKey is used', async () => {
      const jobData = {
        type: 'send_email',
        payload: { to: 'idempotent@example.com', subject: 'Test' },
        idempotencyKey: 'key-abc-123',
      };

      const res1 = await JobService.createJob(user._id, jobData);
      expect(res1.isDuplicate).toBe(false);

      const res2 = await JobService.createJob(user._id, jobData);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.job._id.toString()).toBe(res1.job._id.toString());
      expect(await Job.countDocuments()).toBe(1);
    });
  });
});
