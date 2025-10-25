const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON received:', err.message);
    return res.status(400).json({ msg: 'Invalid JSON in request body' });
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CodeCraft IDE API' });
});

const authRoutes = require('./routes/auth');
const runRoutes = require('./routes/run');
const aiRoutes = require('./routes/ai');
const historyRoutes = require('./routes/history');
const fileRoutes = require('./routes/files');

app.use('/api/auth', authRoutes);
app.use('/api/run', runRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/files', fileRoutes);

module.exports = app;
