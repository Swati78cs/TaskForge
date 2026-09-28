const cronParser = require('cron-parser');
const RecurringJob = require('../models/RecurringJob');
const { ApiError } = require('../utils/response');

class ScheduleService {
  /**
   * Helper to parse cron expression and return next execution Date
   */
  static getNextRunDate(cronExpression) {
    try {
      const interval = cronParser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (err) {
      throw new ApiError(400, `Invalid cron expression '${cronExpression}': ${err.message}`, null, 'INVALID_CRON');
    }
  }

  static async createSchedule(userId, scheduleData) {
    const { name, jobType, payload, cronExpression } = scheduleData;

    const nextRunAt = ScheduleService.getNextRunDate(cronExpression);

    const schedule = await RecurringJob.create({
      userId,
      name,
      jobType,
      payload: payload || {},
      cronExpression,
      status: 'active',
      nextRunAt,
    });

    return schedule;
  }

  static async getSchedules(user, queryParams = {}) {
    const { page = 1, limit = 20, status } = queryParams;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (user.role !== 'ADMIN') {
      filter.userId = user._id;
    }
    if (status) filter.status = status;

    const total = await RecurringJob.countDocuments(filter);
    const schedules = await RecurringJob.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email');

    return {
      schedules,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  static async getScheduleById(id, user) {
    const schedule = await RecurringJob.findById(id).populate('userId', 'name email');
    if (!schedule) {
      throw new ApiError(404, 'Schedule not found', null, 'SCHEDULE_NOT_FOUND');
    }

    if (user.role !== 'ADMIN' && schedule.userId._id.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Access denied to this schedule', null, 'FORBIDDEN');
    }

    return schedule;
  }

  static async updateSchedule(id, user, updateData) {
    const schedule = await ScheduleService.getScheduleById(id, user);

    if (updateData.cronExpression) {
      schedule.nextRunAt = ScheduleService.getNextRunDate(updateData.cronExpression);
      schedule.cronExpression = updateData.cronExpression;
    }
    if (updateData.name) schedule.name = updateData.name;
    if (updateData.payload) schedule.payload = updateData.payload;
    if (updateData.status) schedule.status = updateData.status;

    await schedule.save();
    return schedule;
  }

  static async deleteSchedule(id, user) {
    const schedule = await ScheduleService.getScheduleById(id, user);
    await RecurringJob.findByIdAndDelete(id);
    return { id, deleted: true };
  }

  static async toggleStatus(id, user) {
    const schedule = await ScheduleService.getScheduleById(id, user);
    schedule.status = schedule.status === 'active' ? 'paused' : 'active';
    await schedule.save();
    return schedule;
  }
}

module.exports = ScheduleService;
