const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');
const { OPEN_STATUSES } = require('../utils/constants');

const DAY = 24 * 60 * 60 * 1000;

exports.overview = asyncHandler(async (req, res) => {
  const now = new Date();
  const since = new Date(now.getTime() - 29 * DAY);
  since.setHours(0, 0, 0, 0);

  const isOpen = { $in: ['$status', OPEN_STATUSES] };

  const [byCategory, byStatus, byPriority, byBlock, trendRaw, resolution, summary] = await Promise.all([
    Complaint.aggregate([
      { $group: { _id: '$category', total: { $sum: 1 }, open: { $sum: { $cond: [isOpen, 1, 0] } } } },
      { $sort: { total: -1 } },
    ]),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $group: { _id: '$location.block', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Complaint.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: '$category',
          avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } },
          resolved: { $sum: 1 },
        },
      },
      { $sort: { avgHours: -1 } },
    ]),
    Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [isOpen, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [isOpen, { $lt: ['$slaDueAt', now] }] }, 1, 0] } },
          escalated: { $sum: { $cond: ['$escalated', 1, 0] } },
          avgRating: { $avg: '$rating.score' },
          ratingCount: { $sum: { $cond: [{ $gt: ['$rating.score', null] }, 1, 0] } },
        },
      },
    ]),
  ]);

  // Fill days with no complaints so the chart line is continuous
  const trendMap = new Map(trendRaw.map((t) => [t._id, t.count]));
  const trend = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since.getTime() + i * DAY);
    const key = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    trend.push({ date: key, count: trendMap.get(key) || 0 });
  }

  const s = summary[0] || { total: 0, open: 0, resolved: 0, overdue: 0, escalated: 0, avgRating: null, ratingCount: 0 };

  res.json({
    summary: {
      total: s.total,
      open: s.open,
      resolved: s.resolved,
      overdue: s.overdue,
      escalated: s.escalated,
      avgRating: s.avgRating ? Math.round(s.avgRating * 10) / 10 : null,
      ratingCount: s.ratingCount,
    },
    byCategory: byCategory.map((c) => ({ category: c._id, total: c.total, open: c.open })),
    byStatus: byStatus.map((c) => ({ status: c._id, count: c.count })),
    byPriority: byPriority.map((c) => ({ priority: c._id, count: c.count })),
    byBlock: byBlock.map((c) => ({ block: c._id, count: c.count })),
    resolutionTime: resolution.map((r) => ({
      category: r._id,
      avgHours: Math.round(r.avgHours * 10) / 10,
      resolved: r.resolved,
    })),
    trend,
  });
});
