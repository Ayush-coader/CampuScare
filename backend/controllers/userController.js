const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { CATEGORY_NAMES } = require('../utils/constants');

const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8).max(100),
    role: z.enum(['staff', 'admin', 'hod']),
    department: z.enum(CATEGORY_NAMES).optional(),
  })
  .refine((v) => v.role !== 'staff' || v.department, {
    message: 'Staff members need a department (category)',
    path: ['department'],
  });

// List staff (optionally for one category) - used by the admin "assign" dropdown
exports.listStaff = asyncHandler(async (req, res) => {
  const filter = { role: 'staff', isActive: true };
  if (CATEGORY_NAMES.includes(req.query.category)) filter.department = req.query.category;
  const staff = await User.find(filter).sort({ department: 1, name: 1 }).select('name email department');
  res.json({ staff });
});

// Admin creates staff / admin / HOD accounts
exports.createUser = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  if (await User.exists({ email: data.email.toLowerCase() })) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const user = await User.create(data);
  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department },
  });
});
