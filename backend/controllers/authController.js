const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  rollNo: u.rollNo,
  department: u.department,
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  rollNo: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// Public sign-up is for students only. Staff/admin accounts are created by an admin.
exports.register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase();
  if (domain && !data.email.toLowerCase().endsWith(`@${domain}`)) {
    throw new ApiError(400, `Please use your @${domain} college email`);
  }
  if (await User.exists({ email: data.email.toLowerCase() })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({ ...data, role: 'student' });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled');

  res.json({ token: signToken(user), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
