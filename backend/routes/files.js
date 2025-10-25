const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const UserFile = require('../models/userFileModel');
const { persistUserFile } = require('../utils/userFileHelpers');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.FILE_UPLOAD_MAX_BYTES || `${1024 * 256}`, 10) // 256 KB default
  }
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const docs = await UserFile.find({ userId: req.user?.id })
      .sort({ updatedAt: -1 })
      .select('-content');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await UserFile.findOne({ _id: req.params.id, userId: req.user?.id });
    if (!doc) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { filename, content, language } = req.body || {};
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const doc = await persistUserFile({
      userId: req.user?.id,
      filename,
      language,
      content,
      origin: 'manual'
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err.message && err.message.startsWith('Language')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && err.message.includes('Unable to determine language')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Uploaded file is too large' });
      }
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = req.file.originalname;
      const content = req.file.buffer.toString('utf8');

      const doc = await persistUserFile({
        userId: req.user?.id,
        filename,
        language: req.body?.language,
        content,
        origin: 'upload'
      });

      res.status(201).json(doc);
    } catch (uploadErr) {
      if (uploadErr.message && uploadErr.message.startsWith('Language')) {
        return res.status(400).json({ error: uploadErr.message });
      }
      if (uploadErr.message && uploadErr.message.includes('Unable to determine language')) {
        return res.status(400).json({ error: uploadErr.message });
      }
      res.status(500).json({ error: uploadErr.message });
    }
  });
});

module.exports = router;
