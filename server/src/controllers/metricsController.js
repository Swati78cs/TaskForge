const MetricsService = require('../services/metricsService');
const { ApiResponse } = require('../utils/response');

const getMetrics = async (req, res, next) => {
  try {
    const metrics = await MetricsService.getMetrics(req.user);
    return ApiResponse.success(res, metrics, 'Metrics fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMetrics,
};
