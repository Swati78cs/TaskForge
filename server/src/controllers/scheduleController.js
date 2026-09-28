const { z } = require('zod');
const ScheduleService = require('../services/scheduleService');
const { ApiResponse } = require('../utils/response');

const createScheduleSchema = z.object({
  name: z.string().min(2).max(100),
  jobType: z.enum(['send_email', 'generate_pdf', 'process_image', 'api_request']),
  payload: z.record(z.any()).optional().default({}),
  cronExpression: z.string().min(5),
});

const updateScheduleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  payload: z.record(z.any()).optional(),
  cronExpression: z.string().min(5).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

const createSchedule = async (req, res, next) => {
  try {
    const validated = createScheduleSchema.parse(req.body);
    const schedule = await ScheduleService.createSchedule(req.user._id, validated);
    return ApiResponse.success(res, schedule, 'Recurring job schedule created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const result = await ScheduleService.getSchedules(req.user, req.query);
    return ApiResponse.success(res, result, 'Schedules fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await ScheduleService.getScheduleById(req.params.id, req.user);
    return ApiResponse.success(res, schedule, 'Schedule details fetched successfully');
  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const validated = updateScheduleSchema.parse(req.body);
    const schedule = await ScheduleService.updateSchedule(req.params.id, req.user, validated);
    return ApiResponse.success(res, schedule, 'Schedule updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const result = await ScheduleService.deleteSchedule(req.params.id, req.user);
    return ApiResponse.success(res, result, 'Schedule deleted successfully');
  } catch (error) {
    next(error);
  }
};

const toggleSchedule = async (req, res, next) => {
  try {
    const schedule = await ScheduleService.toggleStatus(req.params.id, req.user);
    return ApiResponse.success(res, schedule, `Schedule status toggled to ${schedule.status}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
};
