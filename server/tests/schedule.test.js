const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const RecurringJob = require('../src/models/RecurringJob');
const Job = require('../src/models/Job');
const { processDueSchedules } = require('../src/scheduler/schedulerEngine');

let mongoServer;
let userToken;
let user;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Schedule Tester',
    email: 'scheduletest@taskforge.dev',
    password: 'password123',
  });

  userToken = regRes.body.data.tokens.accessToken;
  user = regRes.body.data.user;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await RecurringJob.deleteMany({});
  await Job.deleteMany({});
});

describe('Phase 7: Recurring Jobs & Scheduler Engine', () => {
  const sampleSchedule = {
    name: 'Daily Email Digest',
    jobType: 'send_email',
    payload: { to: 'digest@example.com', subject: 'Daily Digest' },
    cronExpression: '0 9 * * *', // Daily at 9:00 AM
  };

  describe('Schedule Management REST APIs', () => {
    it('should create a recurring job schedule and calculate nextRunAt', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleSchedule);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(sampleSchedule.name);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.nextRunAt).toBeDefined();
    });

    it('should reject invalid cron expression', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...sampleSchedule, cronExpression: 'invalid cron' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CRON');
    });

    it('should toggle schedule status between active and paused', async () => {
      const created = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sampleSchedule);

      const id = created.body.data._id;

      const toggleRes = await request(app)
        .post(`/api/schedules/${id}/toggle`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(toggleRes.statusCode).toBe(200);
      expect(toggleRes.body.data.status).toBe('paused');
    });
  });

  describe('Scheduler Engine Processing', () => {
    it('should scan due schedules and enqueue a Job document', async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago

      const schedule = await RecurringJob.create({
        userId: user._id,
        name: 'Due Schedule Test',
        jobType: 'send_email',
        payload: { to: 'due@example.com', subject: 'Due' },
        cronExpression: '* * * * *',
        status: 'active',
        nextRunAt: pastDate,
      });

      // Execute scheduler scan
      await processDueSchedules();

      // Check that a new Job was created
      const createdJobs = await Job.find({ type: 'send_email' });
      expect(createdJobs.length).toBe(1);

      // Check schedule nextRunAt was updated to future
      const updatedSchedule = await RecurringJob.findById(schedule._id);
      expect(new Date(updatedSchedule.nextRunAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
