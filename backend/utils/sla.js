const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const { OPEN_STATUSES, bumpPriority } = require('./constants');

// Finds open complaints that passed their SLA deadline, flags them as escalated
// and raises their priority one level. Each complaint is escalated only once.
async function runSlaCheck() {
  const overdue = await Complaint.find({
    status: { $in: OPEN_STATUSES },
    escalated: false,
    slaDueAt: { $lt: new Date() },
  });

  for (const c of overdue) {
    c.escalated = true;
    c.priority = bumpPriority(c.priority);
    c.statusHistory.push({
      status: c.status,
      note: 'SLA deadline missed - automatically escalated and priority raised',
    });
    await c.save();
  }
  if (overdue.length) console.log(`[SLA] Escalated ${overdue.length} complaint(s)`);
  return overdue.length;
}

function startSlaJob() {
  runSlaCheck().catch((e) => console.error('[SLA] check failed', e));
  cron.schedule('*/15 * * * *', () => {
    runSlaCheck().catch((e) => console.error('[SLA] check failed', e));
  });
}

module.exports = { runSlaCheck, startSlaJob };
