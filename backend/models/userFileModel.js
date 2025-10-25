const mongoose = require('mongoose');

const userFileSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  language: {
    type: String,
    required: true,
    enum: ['python', 'java', 'javascript', 'typescript', 'go', 'ruby', 'php', 'c', 'cpp']
  },
  content: { type: String, required: true },
  size: { type: Number, default: 0 },
  origin: { type: String, enum: ['manual', 'upload', 'generated'], default: 'manual' }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserFile', userFileSchema);
