const express = require('express');
const { askGemini } = require('../utils/geminiClient');
const History = require('../models/historyModel');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', async (req, res) => {
  const { code, type, question } = req.body; // type: explain|fix|improve|ask

  const trimmedCode = typeof code === 'string' ? code.trim() : '';
  const trimmedQuestion = typeof question === 'string' ? question.trim() : '';
  const intent = typeof type === 'string' && type ? type : 'explain';

  if (!trimmedCode && !trimmedQuestion) {
    return res.status(400).json({ error: 'Provide code or a question for the assistant.' });
  }

  const needsQuestion = intent === 'ask';
  if (needsQuestion && !trimmedQuestion) {
    return res.status(400).json({ error: 'Ask mode requires a question to send to the assistant.' });
  }

  const prompt = (() => {
    if (needsQuestion || (!trimmedCode && trimmedQuestion)) {
      return trimmedQuestion;
    }

    let base = `${intent.charAt(0).toUpperCase() + intent.slice(1)} this code:\n${trimmedCode}`;
    if (trimmedQuestion) {
      base += `\n\nAdditional context: ${trimmedQuestion}`;
    }
    return base;
  })();

  try {
    const reply = await askGemini(prompt);

    await History.create({
      action: 'ai',
      userId: req.user?.id,
      code: trimmedCode || undefined,
      output: reply,
      meta: {
        type: intent,
        question: trimmedQuestion || undefined,
        prompt
      }
    });
    res.json({ reply });
  } catch (err) {
    console.error('AI error', err.message);
    await History.create({
      action: 'ai',
      userId: req.user?.id,
      code: trimmedCode || undefined,
      error: err.message,
      meta: {
        type: intent,
        question: trimmedQuestion || undefined,
        prompt
      }
    });
    res.status(500).json({ error: 'AI request failed' });
  }
});

module.exports = router;
