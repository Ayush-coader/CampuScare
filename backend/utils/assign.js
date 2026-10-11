const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { OPEN_STATUSES } = require('./constants');

// Returns the active staff member of `category` with the fewest open complaints, or null.
async function pickLeastLoadedStaff(category) {
  const staff = await User.find({ role: 'staff', department: category, isActive: true });
  if (!staff.length) return null;

  const loads = await Complaint.aggregate([
    { $match: { assignedTo: { $in: staff.map((s) => s._id) }, status: { $in: OPEN_STATUSES } } },
    { $group: { _id: '$assignedTo', open: { $sum: 1 } } },
  ]);
  const loadMap = new Map(loads.map((l) => [String(l._id), l.open]));

  return staff.sort((a, b) => (loadMap.get(String(a._id)) || 0) - (loadMap.get(String(b._id)) || 0))[0];
}

module.exports = { pickLeastLoadedStaff };
