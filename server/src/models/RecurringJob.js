const mongoose = require('mongoose');

const recurringJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Schedule name is required'],
      trim: true,
      maxlength: 100,
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: ['send_email', 'generate_pdf', 'process_image', 'api_request'],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    cronExpression: {
      type: String,
      required: [true, 'Cron expression is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true,
    },
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastRunAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

recurringJobSchema.index({ status: 1, nextRunAt: 1 });

const RecurringJob = mongoose.model('RecurringJob', recurringJobSchema);

module.exports = RecurringJob;
