const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'ONLINE',
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    jobsProcessed: {
      type: Number,
      default: 0,
    },
    jobsFailed: {
      type: Number,
      default: 0,
    },
    concurrency: {
      type: Number,
      default: 5,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const WorkerModel = mongoose.model('Worker', workerSchema);

module.exports = WorkerModel;
