const express = require('express');
const History = require('../models/historyModel');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Create history entry (used by frontend if desired)
router.post('/', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user?.id) {
      payload.userId = req.user.id;
    }
    const doc = await History.create(payload);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get history (optionally filter by userId)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const query = { userId: req.user?.id };
    const docs = await History.find(query).sort({ createdAt: -1 }).limit(limit);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
