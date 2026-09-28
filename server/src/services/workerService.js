const WorkerModel = require('../models/Worker');
const { ApiError } = require('../utils/response');

class WorkerService {
  /**
   * List workers with computed ONLINE / OFFLINE status based on 30s heartbeat threshold.
   */
  static async getWorkers() {
    const threshold = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    const workers = await WorkerModel.find().sort('-lastHeartbeat');

    const formatted = workers.map((w) => {
      const isOnline = w.lastHeartbeat && new Date(w.lastHeartbeat) >= threshold && w.status === 'ONLINE';
      return {
        _id: w._id,
        workerId: w.workerId,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastHeartbeat: w.lastHeartbeat,
        jobsProcessed: w.jobsProcessed,
        jobsFailed: w.jobsFailed,
        concurrency: w.concurrency,
        startedAt: w.startedAt,
        uptimeSeconds: Math.floor((Date.now() - new Date(w.startedAt).getTime()) / 1000),
      };
    });

    const activeCount = formatted.filter((w) => w.status === 'ONLINE').length;

    return {
      workers: formatted,
      totalWorkers: formatted.length,
      activeWorkers: activeCount,
    };
  }

  static async getWorkerById(workerId) {
    const worker = await WorkerModel.findOne({ workerId });
    if (!worker) {
      throw new ApiError(404, `Worker with ID '${workerId}' not found`, null, 'WORKER_NOT_FOUND');
    }

    const threshold = new Date(Date.now() - 30 * 1000);
    const isOnline = worker.lastHeartbeat && new Date(worker.lastHeartbeat) >= threshold && worker.status === 'ONLINE';

    return {
      _id: worker._id,
      workerId: worker.workerId,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      lastHeartbeat: worker.lastHeartbeat,
      jobsProcessed: worker.jobsProcessed,
      jobsFailed: worker.jobsFailed,
      concurrency: worker.concurrency,
      startedAt: worker.startedAt,
      uptimeSeconds: Math.floor((Date.now() - new Date(worker.startedAt).getTime()) / 1000),
    };
  }
}

module.exports = WorkerService;
