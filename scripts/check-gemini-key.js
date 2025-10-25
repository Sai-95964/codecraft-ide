#!/usr/bin/env node

// Reports the length of GEMINI_API_KEY loaded from backend/.env.
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../backend/.env');
dotenv.config({ path: envPath });

const key = process.env.GEMINI_API_KEY || '';

if (!key) {
  console.log('GEMINI_API_KEY is not set.');
  process.exitCode = 1;
} else {
  console.log(`GEMINI_API_KEY length: ${key.length}`);
}