const express = require('express');
const axios = require('axios');
const History = require('../models/historyModel');
const requireAuth = require('../middleware/auth');
const { persistUserFile } = require('../utils/userFileHelpers');

const router = express.Router();

router.use(requireAuth);

// Simple run proxy to Piston public instance
router.post('/', async (req, res) => {
  const { language, code, stdin } = req.body;
  
  console.log('📥 Received run request:', { language, code: code?.substring(0, 50), stdin });
  
  try {
    // If no PISTON_URL set, return a mock response for safety
    const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute';
    if (!PISTON_URL) {
      const mock = { output: 'No runner configured', exitCode: 0 };
      await History.create({ action: 'run', language, code, input: stdin, output: mock.output });
      return res.json({ run: mock });
    }

    // Normalize requested language into a Piston runtime (language + version).
    const normalized = (() => {
      if (!language) {
        return { language: 'python', version: '3.10.0', filename: 'main.py' };
      }

      const key = language.toLowerCase();
      const table = {
        python: { language: 'python', version: '3.10.0', filename: 'main.py' },
        python3: { language: 'python', version: '3.10.0', filename: 'main.py' },
        node: { language: 'javascript', version: '18.15.0', filename: 'main.js' },
        nodejs: { language: 'javascript', version: '18.15.0', filename: 'main.js' },
        javascript: { language: 'javascript', version: '18.15.0', filename: 'main.js' },
        js: { language: 'javascript', version: '18.15.0', filename: 'main.js' },
        typescript: { language: 'typescript', version: '5.0.3', filename: 'main.ts' },
        ts: { language: 'typescript', version: '5.0.3', filename: 'main.ts' },
        go: { language: 'go', version: '1.16.2', filename: 'main.go' },
        golang: { language: 'go', version: '1.16.2', filename: 'main.go' },
        ruby: { language: 'ruby', version: '3.0.1', filename: 'main.rb' },
        php: { language: 'php', version: '8.2.3', filename: 'main.php' },
        java: { language: 'java', version: '15.0.2', filename: 'Main.java' },
        c: { language: 'c', version: '10.2.0', filename: 'main.c' },
        'c99': { language: 'c', version: '10.2.0', filename: 'main.c' },
        cpp: { language: 'cpp', version: '10.2.0', filename: 'main.cpp' },
        'c++': { language: 'cpp', version: '10.2.0', filename: 'main.cpp' }
      };

      const hit = table[key];
      if (!hit) {
        throw new Error(`Unsupported language '${language}'`);
      }
      return hit;
    })();

    const payload = {
      language: normalized.language,
      version: normalized.version,
      files: [
        {
          name: normalized.filename,
          content: code || ''
        }
      ],
      stdin: stdin || ''
    };
    
    console.log('🚀 Sending to Piston:', {
      url: PISTON_URL,
      payload: {
        ...payload,
        files: payload.files.map(file => ({ name: file.name, content: file.content.substring(0, 50) }))
      }
    });
    
    const r = await axios.post(PISTON_URL, payload, { timeout: 20000 });
    const runResult = r.data;
    
    console.log('✅ Piston response:', runResult);

    const normalizedOutput = runResult?.run?.output || runResult?.output || '';
    let savedFile = null;
    if (req.body?.saveFile && req.body.saveFile.filename) {
      try {
        const requested = req.body.saveFile;
        const requestedContent = typeof requested.content === 'string' ? requested.content : null;
        const fallbackContent = typeof code === 'string' ? code : '';
        const contentToPersist = requestedContent || fallbackContent;
        if (!contentToPersist) {
          throw new Error('No file content provided to store');
        }

        savedFile = await persistUserFile({
          userId: req.user?.id,
          filename: requested.filename,
          language: requested.language || language,
          content: contentToPersist,
          origin: 'generated'
        });
      } catch (fileErr) {
        console.error('❌ File save error:', fileErr.message);
        return res.status(400).json({ error: `File save failed: ${fileErr.message}` });
      }
    }

    await History.create({
      action: 'run',
      userId: req.user?.id,
      language: language || normalized.language,
      code,
      input: stdin,
      output: normalizedOutput,
      meta: runResult
    });

    res.json({ run: runResult, savedFile });
  } catch (err) {
    // Log richer error information from the upstream runner when available
    const upstream = err.response && err.response.data ? err.response.data : null;
    if (err.message && err.message.startsWith('Unsupported language')) {
      console.error('❌', err.message);
      return res.status(400).json({ error: err.message });
    }
    console.error('❌ Run error:', err.message);
    if (upstream) {
      console.error('❌ Piston upstream error:', JSON.stringify(upstream, null, 2));
    }
    await History.create({
      action: 'run',
      userId: req.user?.id,
      language,
      code,
      input: stdin,
      error: err.message,
      meta: upstream || { message: err.message }
    });
    res.status(500).json({ error: 'Execution failed', details: err.message, upstream });
  }
});

module.exports = router;
