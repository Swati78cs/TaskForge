const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
const WorkerModel = require('../src/models/Worker');
const { getHandler } = require('../src/handlers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Job.deleteMany({});
  await WorkerModel.deleteMany({});
});

describe('Worker Logic & Processing Unit Tests', () => {
  it('should simulate worker processing a job successfully', async () => {
    const user = await User.create({
      name: 'Worker Unit Tester',
      email: 'workerunit@taskforge.dev',
      passwordHash: 'hashedpwd',
    });

    const job = await Job.create({
      userId: user._id,
      type: 'send_email',
      payload: { to: 'worker-unit@example.com', subject: 'Unit Test' },
      status: 'QUEUED',
      priority: 'HIGH',
    });

    // Simulate worker state transition to PROCESSING
    const startedAt = new Date();
    job.status = 'PROCESSING';
    job.attempts = 1;
    job.startedAt = startedAt;
    job.attemptHistory.push({
      attemptNumber: 1,
      workerId: 'worker-unit-01',
      status: 'PROCESSING',
      startedAt,
    });
    await job.save();

    // Execute handler
    const handler = getHandler(job.type);
    const result = await handler(job.payload, job);
    expect(result.recipient).toBe('worker-unit@example.com');

    // Complete job
    const completedAt = new Date();
    job.status = 'SUCCESS';
    job.completedAt = completedAt;
    const lastAttempt = job.attemptHistory[job.attemptHistory.length - 1];
    lastAttempt.status = 'SUCCESS';
    lastAttempt.completedAt = completedAt;
    lastAttempt.duration = completedAt.getTime() - startedAt.getTime();
    await job.save();

    const finalJob = await Job.findById(job._id);
    expect(finalJob.status).toBe('SUCCESS');
    expect(finalJob.attemptHistory[0].status).toBe('SUCCESS');
  });

  it('should track worker heartbeats and status in Worker model', async () => {
    const worker = await WorkerModel.create({
      workerId: 'worker-node-01',
      status: 'ONLINE',
      jobsProcessed: 12,
      jobsFailed: 1,
      lastHeartbeat: new Date(),
    });

    expect(worker.workerId).toBe('worker-node-01');
    expect(worker.status).toBe('ONLINE');
    expect(worker.jobsProcessed).toBe(12);
  });
});
