const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { ApiResponse, ApiError } = require('./utils/response');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const workerRoutes = require('./routes/workerRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/metrics', metricsRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
  return ApiResponse.success(res, {
    status: 'HEALTHY',
    service: 'TaskForge API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  }, 'TaskForge API is operational');
});

// 404 Handler for undefined routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, null, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
