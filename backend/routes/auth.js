const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const requireAuth = require('../middleware/auth');

const router = express.Router();

async function ensureLegacyUsernames() {
  const legacyUsers = await User.find({ $or: [{ username: { $exists: false } }, { username: null }] }).select('_id email username');
  if (!legacyUsers.length) return;

  await Promise.all(legacyUsers.map(async (u) => {
    u.username = u.email;
    await u.save();
  }));
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  };
}

// Register
router.post('/register', async (req, res) => {
  try {
  const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'Missing fields' });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ msg: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
  await ensureLegacyUsernames();
  const user = await User.create({ name, email: normalizedEmail, username: normalizedEmail, password: hash });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
  res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
  const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Missing fields' });

  await ensureLegacyUsernames();

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ msg: 'No user found' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    await ensureLegacyUsernames();
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
