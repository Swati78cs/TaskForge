const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const WorkerModel = require('../src/models/Worker');

let mongoServer;
let adminToken;
let user;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Metrics Admin',
    email: 'adminmetrics@taskforge.dev',
    password: 'password123',
    role: 'ADMIN',
  });

  adminToken = regRes.body.data.tokens.accessToken;
  user = regRes.body.data.user;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Job.deleteMany({});
  await WorkerModel.deleteMany({});
});

describe('Phase 8: Worker Monitoring & System Metrics', () => {
  describe('GET /api/workers', () => {
    it('should return list of registered workers with calculated online status', async () => {
      await WorkerModel.create({
        workerId: 'worker-node-101',
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        jobsProcessed: 42,
        jobsFailed: 2,
      });

      const res = await request(app)
        .get('/api/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalWorkers).toBe(1);
      expect(res.body.data.activeWorkers).toBe(1);
      expect(res.body.data.workers[0].workerId).toBe('worker-node-101');
      expect(res.body.data.workers[0].status).toBe('ONLINE');
    });
  });

  describe('GET /api/metrics', () => {
    it('should aggregate job stats, rates, durations, and jobsByType', async () => {
      const now = new Date();
      const tenSecsAgo = new Date(now.getTime() - 10000);

      // Create sample jobs
      await Job.create({
        userId: user._id,
        type: 'send_email',
        status: 'SUCCESS',
        startedAt: tenSecsAgo,
        completedAt: now,
        attempts: 1,
      });

      await Job.create({
        userId: user._id,
        type: 'generate_pdf',
        status: 'FAILED',
        attempts: 3,
        maxAttempts: 3,
      });

      await Job.create({
        userId: user._id,
        type: 'process_image',
        status: 'QUEUED',
        attempts: 0,
      });

      const res = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.total).toBe(3);
      expect(res.body.data.overview.successful).toBe(1);
      expect(res.body.data.overview.failed).toBe(1);
      expect(res.body.data.overview.queued).toBe(1);
      expect(res.body.data.jobsByType.send_email).toBe(1);
      expect(res.body.data.jobsByType.generate_pdf).toBe(1);
      expect(res.body.data.performance.avgDurationMs).toBe(10000);
    });
  });
});
