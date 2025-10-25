const axios = require('axios');

// A thin wrapper around Gemini; if no API key provided, returns a mock reply for offline testing.
async function askGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return `Mock reply for prompt: ${prompt.slice(0, 200)}...`;
  }

  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  const model = process.env.GEMINI_MODEL || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  try {
  const response = await axios.post(url, body, { timeout: 60000 });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(response.data);
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || error.message;
    throw new Error(`Gemini API${status ? ` ${status}` : ''}: ${detail}`);
  }
}

module.exports = { askGemini };
