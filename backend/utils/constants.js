// Single source of truth for categories, SLAs, statuses, etc.
// The frontend reads these through GET /api/meta.

const CATEGORIES = {
  Hostel: { slaHours: 48, basePriority: 'medium' },
  Mess: { slaHours: 24, basePriority: 'medium' },
  'Wi-Fi': { slaHours: 24, basePriority: 'medium' },
  Electrical: { slaHours: 24, basePriority: 'high' },
  Plumbing: { slaHours: 48, basePriority: 'medium' },
  Infrastructure: { slaHours: 72, basePriority: 'medium' },
  Academic: { slaHours: 72, basePriority: 'low' },
  Safety: { slaHours: 12, basePriority: 'critical' },
  Other: { slaHours: 72, basePriority: 'low' },
};

const CATEGORY_NAMES = Object.keys(CATEGORIES);
const ROLES = ['student', 'staff', 'admin', 'hod'];
const STATUSES = ['pending', 'in_progress', 'resolved', 'rejected'];
const OPEN_STATUSES = ['pending', 'in_progress'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const BLOCKS = [
  'Hostel A',
  'Hostel B',
  'Academic Block',
  'Library',
  'Mess / Canteen',
  'Sports Complex',
  'Admin Block',
  'Other',
];

const UPVOTE_ESCALATION_THRESHOLD = 5; // upvotes needed to auto-raise priority to "high"
const MAX_COMPLAINTS_PER_DAY = 5; // spam control per student

const priorityRank = (p) => PRIORITIES.indexOf(p);
const bumpPriority = (p) => PRIORITIES[Math.min(priorityRank(p) + 1, PRIORITIES.length - 1)];

module.exports = {
  CATEGORIES,
  CATEGORY_NAMES,
  ROLES,
  STATUSES,
  OPEN_STATUSES,
  PRIORITIES,
  BLOCKS,
  UPVOTE_ESCALATION_THRESHOLD,
  MAX_COMPLAINTS_PER_DAY,
  priorityRank,
  bumpPriority,
};
