const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { pickLeastLoadedStaff } = require('../utils/assign');
const { canView, canManage, listFilterFor, toClient, idOf } = require('../utils/access');
const {
  CATEGORIES,
  CATEGORY_NAMES,
  STATUSES,
  OPEN_STATUSES,
  PRIORITIES,
  BLOCKS,
  UPVOTE_ESCALATION_THRESHOLD,
  MAX_COMPLAINTS_PER_DAY,
  priorityRank,
} = require('../utils/constants');

const POPULATE = [
  { path: 'createdBy', select: 'name rollNo' },
  { path: 'assignedTo', select: 'name department' },
  { path: 'statusHistory.changedBy', select: 'name role' },
];

const removeUploadedFile = (file) => {
  if (!file) return;
  fs.unlink(file.path, () => {});
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- validation schemas ----------
const createSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(10, 'Please describe the problem (10+ characters)').max(2000),
  category: z.enum(CATEGORY_NAMES),
  block: z.enum(BLOCKS),
  floor: z.string().trim().max(20).optional().default(''),
  room: z.string().trim().max(30).optional().default(''),
  isAnonymous: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
});

const statusSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).optional(),
});

const triageSchema = z
  .object({
    staffId: z.string().optional(),
    priority: z.enum(PRIORITIES).optional(),
  })
  .refine((v) => v.staffId || v.priority, { message: 'Provide a staff member and/or a priority' });

const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  feedback: z.string().trim().max(500).optional(),
});

// ---------- create ----------
exports.create = asyncHandler(async (req, res) => {
  let data;
  try {
    data = createSchema.parse(req.body);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todays = await Complaint.countDocuments({ createdBy: req.user._id, createdAt: { $gte: since } });
    if (todays >= MAX_COMPLAINTS_PER_DAY) {
      throw new ApiError(429, `Daily limit reached (${MAX_COMPLAINTS_PER_DAY} complaints per 24 hours)`);
    }
  } catch (err) {
    removeUploadedFile(req.file);
    throw err;
  }

  const cfg = CATEGORIES[data.category];
  const complaint = new Complaint({
    title: data.title,
    description: data.description,
    category: data.category,
    location: { block: data.block, floor: data.floor, room: data.room },
    isAnonymous: data.isAnonymous === true || data.isAnonymous === 'true',
    imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    priority: cfg.basePriority,
    slaDueAt: new Date(Date.now() + cfg.slaHours * 60 * 60 * 1000),
    createdBy: req.user._id,
    statusHistory: [{ status: 'pending', changedBy: req.user._id, note: 'Complaint submitted' }],
  });

  // Smart routing: hand it to the least-loaded staff member of that category
  if (process.env.AUTO_ASSIGN !== 'false') {
    const staff = await pickLeastLoadedStaff(data.category);
    if (staff) {
      complaint.assignedTo = staff._id;
      complaint.statusHistory.push({ status: 'pending', note: `Auto-assigned to ${staff.name}` });
    }
  }

  await complaint.save();
  await complaint.populate(POPULATE);
  res.status(201).json({ complaint: toClient(complaint, req.user) });
});

// ---------- list (role-scoped) ----------
exports.list = asyncHandler(async (req, res) => {
  const { status, category, priority, q, overdue, escalated, assigned } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { ...listFilterFor(req.user) };
  const and = [];
  if (STATUSES.includes(status)) filter.status = status;
  if (status === 'open') filter.status = { $in: OPEN_STATUSES };
  if (CATEGORY_NAMES.includes(category)) filter.category = category;
  if (PRIORITIES.includes(priority)) filter.priority = priority;
  if (q && String(q).trim()) and.push({ title: { $regex: escapeRegex(String(q).trim()), $options: 'i' } });
  if (overdue === 'true') {
    filter.status = { $in: OPEN_STATUSES };
    filter.slaDueAt = { $lt: new Date() };
  }
  if (escalated === 'true') filter.escalated = true;
  if (assigned === 'me') filter.assignedTo = req.user._id;
  if (assigned === 'none') filter.assignedTo = { $exists: false };
  if (and.length) filter.$and = and;

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .select('-statusHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE.slice(0, 2)),
    Complaint.countDocuments(filter),
  ]);

  res.json({
    items: items.map((c) => toClient(c, req.user)),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

// ---------- public feed of open issues (for upvoting) ----------
exports.feed = asyncHandler(async (req, res) => {
  const { category, sort } = req.query;
  const filter = { status: { $in: OPEN_STATUSES } };
  if (CATEGORY_NAMES.includes(category)) filter.category = category;

  const items = await Complaint.find(filter)
    .select('-statusHistory')
    .sort(sort === 'recent' ? { createdAt: -1 } : { upvoteCount: -1, createdAt: -1 })
    .limit(60);

  res.json({
    items: items.map((c) => {
      const out = toClient(c, req.user);
      out.createdBy = null; // the feed never reveals who reported what
      return out;
    }),
  });
});

// ---------- duplicate detection ----------
exports.similar = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 4) return res.json({ items: [] });

  const filter = { $text: { $search: q }, status: { $in: OPEN_STATUSES } };
  if (CATEGORY_NAMES.includes(req.query.category)) filter.category = req.query.category;
  if (BLOCKS.includes(req.query.block)) filter['location.block'] = req.query.block;

  const items = await Complaint.find(filter, { score: { $meta: 'textScore' } })
    .select('title category location status upvotes upvoteCount createdAt')
    .sort({ score: { $meta: 'textScore' } })
    .limit(5);

  res.json({
    items: items.map((c) => {
      const out = toClient(c, req.user);
      out.createdBy = null;
      return out;
    }),
  });
});

// ---------- single complaint ----------
async function loadComplaint(id) {
  const c = await Complaint.findById(id).populate(POPULATE);
  if (!c) throw new ApiError(404, 'Complaint not found');
  return c;
}

exports.get = asyncHandler(async (req, res) => {
  const c = await loadComplaint(req.params.id);
  if (!canView(req.user, c)) throw new ApiError(403, 'You cannot view this complaint');
  res.json({ complaint: toClient(c, req.user), canManage: canManage(req.user, c) });
});

// ---------- status update (staff / admin) ----------
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = statusSchema.parse(req.body);
  const c = await loadComplaint(req.params.id);
  if (!canManage(req.user, c)) throw new ApiError(403, 'You cannot manage this complaint');
  if (status === 'rejected' && !note) throw new ApiError(400, 'Please add a reason when rejecting a complaint');
  if (status === c.status && !note) throw new ApiError(400, 'Status is unchanged - add a note or pick a new status');

  c.status = status;
  c.resolvedAt = status === 'resolved' ? new Date() : undefined;
  if (req.user.role === 'staff' && !c.assignedTo) c.assignedTo = req.user._id;
  c.statusHistory.push({ status, changedBy: req.user._id, note });
  await c.save();
  await c.populate(POPULATE);

  res.json({ complaint: toClient(c, req.user), canManage: true });
});

// ---------- assign / change priority (admin) ----------
exports.triage = asyncHandler(async (req, res) => {
  const { staffId, priority } = triageSchema.parse(req.body);
  const c = await loadComplaint(req.params.id);
  const notes = [];

  if (staffId) {
    const staff = await User.findOne({ _id: staffId, role: 'staff', isActive: true });
    if (!staff) throw new ApiError(404, 'Staff member not found');
    c.assignedTo = staff._id;
    notes.push(`Assigned to ${staff.name}${staff.department ? ` (${staff.department})` : ''}`);
  }
  if (priority && priority !== c.priority) {
    c.priority = priority;
    notes.push(`Priority set to ${priority}`);
  }
  if (notes.length) {
    c.statusHistory.push({ status: c.status, changedBy: req.user._id, note: notes.join('; ') });
  }
  await c.save();
  await c.populate(POPULATE);

  res.json({ complaint: toClient(c, req.user), canManage: true });
});

// ---------- upvote toggle ----------
exports.toggleUpvote = asyncHandler(async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Complaint not found');
  if (!OPEN_STATUSES.includes(c.status)) throw new ApiError(400, 'Only open complaints can be upvoted');
  if (!['student', 'staff'].includes(req.user.role)) throw new ApiError(403, 'Not allowed');

  const uid = String(req.user._id);
  const idx = c.upvotes.findIndex((id) => String(id) === uid);
  const added = idx === -1;
  if (added) c.upvotes.push(req.user._id);
  else c.upvotes.splice(idx, 1);
  c.upvoteCount = c.upvotes.length;

  // Many people hitting the same problem => raise urgency automatically
  if (added && c.upvoteCount >= UPVOTE_ESCALATION_THRESHOLD && priorityRank(c.priority) < priorityRank('high')) {
    c.priority = 'high';
    c.statusHistory.push({
      status: c.status,
      note: `Priority raised to high after ${c.upvoteCount} upvotes`,
    });
  }
  await c.save();

  res.json({ upvoteCount: c.upvoteCount, hasUpvoted: added, priority: c.priority });
});

// ---------- rating (owner, after resolution) ----------
exports.rate = asyncHandler(async (req, res) => {
  const { score, feedback } = ratingSchema.parse(req.body);
  const c = await loadComplaint(req.params.id);
  if (idOf(c.createdBy) !== String(req.user._id)) throw new ApiError(403, 'Only the reporter can rate this');
  if (c.status !== 'resolved') throw new ApiError(400, 'You can rate a complaint once it is resolved');
  if (c.rating?.score) throw new ApiError(400, 'You have already rated this complaint');

  c.rating = { score, feedback, at: new Date() };
  await c.save();
  res.json({ complaint: toClient(c, req.user), canManage: false });
});

// ---------- delete ----------
exports.remove = asyncHandler(async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Complaint not found');

  const isOwner = idOf(c.createdBy) === String(req.user._id);
  const allowed = req.user.role === 'admin' || (isOwner && c.status === 'pending');
  if (!allowed) throw new ApiError(403, 'You can only delete your own complaint while it is still pending');

  if (c.imageUrl) fs.unlink(path.join(__dirname, '..', c.imageUrl), () => {});
  await Comment.deleteMany({ complaint: c._id });
  await c.deleteOne();
  res.json({ message: 'Complaint deleted' });
});
