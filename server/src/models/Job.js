const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    attemptNumber: { type: Number, required: true },
    workerId: { type: String },
    status: { type: String, required: true },
    error: { type: String },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    duration: { type: Number }, // in milliseconds
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Job type is required'],
      enum: ['send_email', 'generate_pdf', 'process_image', 'api_request'],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['PENDING', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING', 'DEAD_LETTER', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
      default: 'NORMAL',
    },
    idempotencyKey: {
      type: String,
    },
    scheduledAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: [1, 'maxAttempts must be at least 1'],
      max: [10, 'maxAttempts cannot exceed 10'],
    },
    lastError: {
      type: String,
    },
    attemptHistory: [attemptSchema],
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes specified in prompt (Section 8)
jobSchema.index({ status: 1, priority: -1 });
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ scheduledAt: 1 });
jobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
