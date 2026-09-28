const Job = require('../models/Job');
const WorkerService = require('./workerService');

class MetricsService {
  static async getMetrics(user) {
    const isUserFilter = user && user.role !== 'ADMIN';
    const filter = isUserFilter ? { userId: user._id } : {};

    const [
      total,
      pending,
      queued,
      processing,
      successful,
      failed,
      deadLetter,
      cancelled,
    ] = await Promise.all([
      Job.countDocuments(filter),
      Job.countDocuments({ ...filter, status: 'PENDING' }),
      Job.countDocuments({ ...filter, status: 'QUEUED' }),
      Job.countDocuments({ ...filter, status: 'PROCESSING' }),
      Job.countDocuments({ ...filter, status: 'SUCCESS' }),
      Job.countDocuments({ ...filter, status: 'FAILED' }),
      Job.countDocuments({ ...filter, status: 'DEAD_LETTER' }),
      Job.countDocuments({ ...filter, status: 'CANCELLED' }),
    ]);

    const completedTotal = successful + failed + deadLetter;
    const successRatePercent = completedTotal > 0 ? parseFloat(((successful / completedTotal) * 100).toFixed(2)) : 0;
    const failureRatePercent = completedTotal > 0 ? parseFloat((((failed + deadLetter) / completedTotal) * 100).toFixed(2)) : 0;

    // Retry rate calculation: jobs with attempts > 1
    const retriedCount = await Job.countDocuments({ ...filter, attempts: { $gt: 1 } });
    const retryRatePercent = total > 0 ? parseFloat(((retriedCount / total) * 100).toFixed(2)) : 0;

    // Average duration of successful jobs
    const durationAggregation = await Job.aggregate([
      { $match: { ...filter, status: 'SUCCESS', completedAt: { $exists: true }, startedAt: { $exists: true } } },
      {
        $project: {
          duration: { $subtract: ['$completedAt', '$startedAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    const avgDurationMs = durationAggregation.length > 0 ? Math.round(durationAggregation[0].avgDuration) : 0;

    // Job types breakdown
    const typeAggregation = await Job.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const jobsByType = {
      send_email: 0,
      generate_pdf: 0,
      process_image: 0,
      api_request: 0,
    };

    typeAggregation.forEach((item) => {
      if (item._id && jobsByType[item._id] !== undefined) {
        jobsByType[item._id] = item.count;
      }
    });

    // Worker metrics
    const workerStats = await WorkerService.getWorkers();

    // Jobs over time (last 7 days breakdown for Recharts)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overTimeAggregation = await Job.aggregate([
      { $match: { ...filter, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          successful: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ['$status', ['FAILED', 'DEAD_LETTER']] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      overview: {
        total,
        pending,
        queued,
        processing,
        successful,
        failed,
        deadLetter,
        cancelled,
        queueDepth: queued + pending,
      },
      performance: {
        successRatePercent,
        failureRatePercent,
        retryRatePercent,
        avgDurationMs,
      },
      jobsByType,
      workers: {
        total: workerStats.totalWorkers,
        active: workerStats.activeWorkers,
      },
      jobsProcessedOverTime: overTimeAggregation.map((item) => ({
        date: item._id,
        total: item.total,
        successful: item.successful,
        failed: item.failed,
      })),
    };
  }
}

module.exports = MetricsService;
