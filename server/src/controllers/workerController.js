const WorkerService = require('../services/workerService');
const { ApiResponse } = require('../utils/response');

const getWorkers = async (req, res, next) => {
  try {
    const result = await WorkerService.getWorkers();
    return ApiResponse.success(res, result, 'Worker list retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getWorkerById = async (req, res, next) => {
  try {
    const worker = await WorkerService.getWorkerById(req.params.id);
    return ApiResponse.success(res, worker, 'Worker details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkers,
  getWorkerById,
};
