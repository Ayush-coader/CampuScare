const { OPEN_STATUSES } = require('./constants');

const idOf = (v) => String(v?._id || v || '');

// Who may open a complaint
function canView(user, c) {
  if (['admin', 'hod'].includes(user.role)) return true;
  if (user.role === 'student') return idOf(c.createdBy) === String(user._id);
  if (user.role === 'staff') {
    return idOf(c.assignedTo) === String(user._id) || c.category === user.department;
  }
  return false;
}

// Who may change status / add internal notes
function canManage(user, c) {
  if (user.role === 'admin') return true;
  if (user.role === 'staff') {
    return idOf(c.assignedTo) === String(user._id) || c.category === user.department;
  }
  return false;
}

// Mongo filter for "complaints this user is allowed to list"
function listFilterFor(user) {
  if (user.role === 'student') return { createdBy: user._id };
  if (user.role === 'staff') {
    return { $or: [{ assignedTo: user._id }, ...(user.department ? [{ category: user.department }] : [])] };
  }
  return {};
}

// Shapes a complaint for the API response:
//  - hides the author of anonymous complaints from everyone except the author
//  - replaces the raw upvotes array with upvoteCount + hasUpvoted
//  - adds `overdue` and `isOwner`
function toClient(doc, user) {
  const c = doc.toObject ? doc.toObject() : { ...doc };
  const uid = String(user._id);
  const ownerId = idOf(c.createdBy);
  const isOwner = ownerId === uid;

  c.hasUpvoted = (c.upvotes || []).some((id) => String(id) === uid);
  delete c.upvotes;
  c.isOwner = isOwner;
  c.overdue = OPEN_STATUSES.includes(c.status) && new Date(c.slaDueAt) < new Date();

  if (c.isAnonymous && !isOwner) {
    c.createdBy = null;
    c.statusHistory = (c.statusHistory || []).map((h) =>
      idOf(h.changedBy) === ownerId ? { ...h, changedBy: { name: 'Anonymous', role: 'student' } } : h
    );
  }
  return c;
}

module.exports = { canView, canManage, listFilterFor, toClient, idOf };
