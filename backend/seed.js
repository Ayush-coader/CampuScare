// Fills the database with demo users and complaints so dashboards aren't empty.
// Usage: npm run seed      (WARNING: wipes users, complaints and comments)

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Comment = require('./models/Comment');
const { CATEGORIES, BLOCKS } = require('./utils/constants');

const HOUR = 60 * 60 * 1000;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const SAMPLES = {
  Hostel: ['Room door lock is broken', 'Bunk bed frame is loose', 'Window glass cracked in corridor'],
  Mess: ['Food quality has dropped this week', 'Water dispenser not working', 'Hygiene issue in serving area'],
  'Wi-Fi': ['Wi-Fi is down on the 2nd floor', 'Very slow internet in the evening', 'Router keeps disconnecting'],
  Electrical: ['Corridor lights not working', 'Fan makes loud noise', 'Socket sparks when plugged in'],
  Plumbing: ['Tap leaking continuously', 'Washroom flush not working', 'No hot water in the morning'],
  Infrastructure: ['Broken bench near the entrance', 'Pothole on the main road', 'Classroom projector is not working'],
  Academic: ['Lab equipment shortage', 'Timetable clash for elective', 'Library is short of reference books'],
  Safety: ['Street light off near the back gate', 'Fire extinguisher expired', 'Loose wire hanging in the stairwell'],
  Other: ['Stray dogs near the sports complex', 'Lost and found desk is unattended'],
};

async function run() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Complaint.deleteMany({}), Comment.deleteMany({})]);

  const admin = await User.create({ name: 'Campus Admin', email: 'admin@campus.edu', password: 'Admin@123', role: 'admin' });
  await User.create({ name: 'Dr. Sharma (HOD)', email: 'hod@campus.edu', password: 'Hod@12345', role: 'hod' });

  const staffByCategory = {};
  for (const cat of Object.keys(CATEGORIES)) {
    const slug = cat.toLowerCase().replace(/[^a-z]/g, '');
    staffByCategory[cat] = await User.create({
      name: `${cat} Staff`,
      email: `${slug}@campus.edu`,
      password: 'Staff@123',
      role: 'staff',
      department: cat,
    });
  }

  const students = [];
  for (let i = 1; i <= 8; i++) {
    students.push(
      await User.create({
        name: `Student ${i}`,
        email: `student${i}@campus.edu`,
        password: 'Student@123',
        role: 'student',
        rollNo: `23CS${String(100 + i)}`,
      })
    );
  }

  const statuses = ['pending', 'pending', 'in_progress', 'in_progress', 'resolved', 'resolved', 'resolved', 'rejected'];
  let count = 0;

  for (const [category, titles] of Object.entries(SAMPLES)) {
    for (const title of titles) {
      const cfg = CATEGORIES[category];
      const student = pick(students);
      const status = pick(statuses);
      const createdAt = new Date(Date.now() - Math.random() * 25 * 24 * HOUR);
      const staff = staffByCategory[category];
      const upvoters = students.filter(() => Math.random() < 0.3).map((s) => s._id);

      const history = [{ status: 'pending', changedBy: student._id, note: 'Complaint submitted', at: createdAt }];
      history.push({ status: 'pending', note: `Auto-assigned to ${staff.name}`, at: createdAt });

      let resolvedAt;
      if (status !== 'pending') {
        const at = new Date(createdAt.getTime() + (2 + Math.random() * 20) * HOUR);
        history.push({
          status,
          changedBy: staff._id,
          note: status === 'rejected' ? 'Duplicate of an existing ticket' : status === 'resolved' ? 'Fixed and verified' : 'Work started',
          at,
        });
        if (status === 'resolved') resolvedAt = at;
      }

      const slaDueAt = new Date(createdAt.getTime() + cfg.slaHours * HOUR);
      const open = status === 'pending' || status === 'in_progress';

      const complaint = await Complaint.create({
        title,
        description: `${title}. This has been affecting students for a few days now and needs attention.`,
        category,
        location: { block: pick(BLOCKS), floor: String(Math.ceil(Math.random() * 3)), room: '' },
        status,
        priority: cfg.basePriority,
        isAnonymous: Math.random() < 0.15,
        createdBy: student._id,
        assignedTo: staff._id,
        upvotes: upvoters,
        upvoteCount: upvoters.length,
        statusHistory: history,
        slaDueAt,
        escalated: open && slaDueAt < new Date(),
        resolvedAt,
        createdAt,
        updatedAt: resolvedAt || createdAt,
        ...(status === 'resolved' && Math.random() < 0.6
          ? { rating: { score: 3 + Math.floor(Math.random() * 3), feedback: 'Thanks for the quick fix', at: resolvedAt } }
          : {}),
      });

      if (status !== 'pending') {
        await Comment.create({
          complaint: complaint._id,
          author: staff._id,
          body: status === 'in_progress' ? 'Our team is looking into this.' : 'Update posted - please check.',
        });
      }
      count++;
    }
  }

  console.log(`Seeded ${students.length + 2 + Object.keys(staffByCategory).length} users and ${count} complaints.\n`);
  console.log('Demo logins:');
  console.log('  Admin    admin@campus.edu     / Admin@123');
  console.log('  HOD      hod@campus.edu       / Hod@12345');
  console.log('  Staff    wifi@campus.edu      / Staff@123   (also hostel@, mess@, electrical@, plumbing@ ...)');
  console.log('  Student  student1@campus.edu  / Student@123  (student1 .. student8)');
  void admin;
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
