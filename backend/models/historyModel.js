const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: { type: String },
  action: { type: String }, // 'run' | 'ai'
  language: { type: String },
  code: { type: String },
  input: { type: String },
  output: { type: String },
  error: { type: String },
  meta: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', historySchema);
