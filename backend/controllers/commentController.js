const { z } = require('zod');
const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { canView, canManage, idOf } = require('../utils/access');

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(1000),
  isInternal: z.boolean().optional(),
});

async function loadViewable(req) {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Complaint not found');
  if (!canView(req.user, c)) throw new ApiError(403, 'You cannot view this complaint');
  return c;
}

// Hide the identity of an anonymous reporter in comments
function shape(comment, complaint, user) {
  const out = comment.toObject();
  const ownerId = idOf(complaint.createdBy);
  if (complaint.isAnonymous && idOf(out.author) === ownerId && ownerId !== String(user._id)) {
    out.author = { name: 'Anonymous', role: 'student' };
  }
  return out;
}

exports.list = asyncHandler(async (req, res) => {
  const complaint = await loadViewable(req);
  const filter = { complaint: complaint._id };
  if (req.user.role === 'student') filter.isInternal = false;

  const comments = await Comment.find(filter).sort({ createdAt: 1 }).populate('author', 'name role');
  res.json({ comments: comments.map((c) => shape(c, complaint, req.user)) });
});

exports.create = asyncHandler(async (req, res) => {
  const { body, isInternal } = commentSchema.parse(req.body);
  const complaint = await loadViewable(req);

  const manager = canManage(req.user, complaint);
  if (req.user.role === 'student' && idOf(complaint.createdBy) !== String(req.user._id)) {
    throw new ApiError(403, 'Not allowed');
  }

  const comment = await Comment.create({
    complaint: complaint._id,
    author: req.user._id,
    body,
    isInternal: manager && isInternal === true,
  });
  await comment.populate('author', 'name role');
  res.status(201).json({ comment: shape(comment, complaint, req.user) });
});
