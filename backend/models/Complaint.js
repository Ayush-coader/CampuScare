const mongoose = require('mongoose');
const { CATEGORY_NAMES, STATUSES, PRIORITIES, BLOCKS } = require('../utils/constants');

// Every status change / assignment / escalation is appended here (audit trail).
// `changedBy` is empty for system actions (auto-escalation, upvote threshold).
const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, enum: CATEGORY_NAMES, required: true, index: true },
    location: {
      block: { type: String, enum: BLOCKS, required: true },
      floor: { type: String, trim: true, maxlength: 20, default: '' },
      room: { type: String, trim: true, maxlength: 30, default: '' },
    },
    imageUrl: { type: String },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium', index: true },
    isAnonymous: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0, index: true },
    statusHistory: [historySchema],
    slaDueAt: { type: Date, required: true, index: true },
    escalated: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: { type: String, trim: true, maxlength: 500 },
      at: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Used for duplicate detection ("is this the same issue?")
complaintSchema.index({ title: 'text', description: 'text' });

complaintSchema.virtual('ticketNo').get(function () {
  return `CC-${String(this._id).slice(-6).toUpperCase()}`;
});

module.exports = mongoose.model('Complaint', complaintSchema);
