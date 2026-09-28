const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Job = require('../src/models/Job');

let mongoServer;
let userToken;
let user2Token;
let adminToken;
let userObj;
let user2Obj;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup test users
  const user1Res = await request(app).post('/api/auth/register').send({
    name: 'User One',
    email: 'user1@taskforge.dev',
    password: 'password123',
  });
  userToken = user1Res.body.data.tokens.accessToken;
  userObj = user1Res.body.data.user;

  const user2Res = await request(app).post('/api/auth/register').send({
    name: 'User Two',
    email: 'user2@taskforge.dev',
    password: 'password123',
  });
  user2Token = user2Res.body.data.tokens.accessToken;
  user2Obj = user2Res.body.data.user;

  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Admin User',
    email: 'admin@taskforge.dev',
    password: 'password123',
    role: 'ADMIN',
  });
  adminToken = adminRes.body.data.tokens.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Job.deleteMany({});
});

describe('Job Management APIs', () => {
  const sampleJobData = {
    type: 'send_email',
    payload: { to: 'test@example.com', subject: 'Hello' },
    priority: 'HIGH',
    maxAttempts: 3,
    idempotencyKey: 'email-key-1001',
  };

  describe('POST /api/jobs', () => {
    it('should create a new job successfully', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('send_email');
      expect(['PENDING', 'QUEUED'].includes(res.body.data.status)).toBe(true);
      expect(res.body.data.priority).toBe('HIGH');
    });

    it('should enforce idempotency and return existing job on duplicate key', async () => {
      const res1 = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      const res2 = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.data._id).toBe(res1.body.data._id);
      expect(await Job.countDocuments()).toBe(1);
    });

    it('should reject invalid job type', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'unsupported_type' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/jobs and GET /api/jobs/:id', () => {
    it('should list only user-owned jobs for standard user', async () => {
      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...sampleJobData, idempotencyKey: 'key-1' });

      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ ...sampleJobData, idempotencyKey: 'key-2' });

      const res1 = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res1.body.data.jobs.length).toBe(1);

      const resAdmin = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.body.data.jobs.length).toBe(2);
    });

    it('should restrict access to job details owned by another user', async () => {
      const created = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      const jobId = created.body.data._id;

      const user2Access = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Access.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/jobs/:id (Cancellation)', () => {
    it('should cancel a PENDING job', async () => {
      const created = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      const jobId = created.body.data._id;

      const cancelRes = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancelRes.statusCode).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should cancel a QUEUED job', async () => {
      const created = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...sampleJobData, idempotencyKey: 'queued-cancel-key' });

      const jobId = created.body.data._id;
      await Job.findByIdAndUpdate(jobId, { status: 'QUEUED' });

      const cancelRes = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancelRes.statusCode).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should reject cancellation of a SUCCESS job with INVALID_STATE_TRANSITION', async () => {
      const created = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...sampleJobData, idempotencyKey: 'success-cancel-key' });

      const jobId = created.body.data._id;
      await Job.findByIdAndUpdate(jobId, { status: 'SUCCESS' });

      const cancelRes = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancelRes.statusCode).toBe(400);
      expect(cancelRes.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('POST /api/jobs/:id/retry', () => {
    it('should allow retrying a FAILED or DEAD_LETTER job', async () => {
      const created = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      const jobId = created.body.data._id;
      // Manually set status to FAILED in DB
      await Job.findByIdAndUpdate(jobId, { status: 'FAILED' });

      const retryRes = await request(app)
        .post(`/api/jobs/${jobId}/retry`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(retryRes.statusCode).toBe(200);
      expect(['RETRYING', 'QUEUED'].includes(retryRes.body.data.status)).toBe(true);
    });

    it('should reject retry on a PENDING job', async () => {
      const created = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleJobData);

      const jobId = created.body.data._id;

      const retryRes = await request(app)
        .post(`/api/jobs/${jobId}/retry`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(retryRes.statusCode).toBe(400);
      expect(retryRes.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});
