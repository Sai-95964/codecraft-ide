const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../app');
const History = require('../models/historyModel');

jest.mock('../utils/geminiClient', () => ({
  askGemini: jest.fn()
}));

const { askGemini } = require('../utils/geminiClient');

describe('POST /api/ai', () => {
  let mongo;
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'devsecret');

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await History.deleteMany();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  it('returns assistant reply and stores history', async () => {
    askGemini.mockResolvedValue('This code prints a greeting.');

    const response = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: "print('Hello')", type: 'explain' })
      .expect(200);

    expect(response.body.reply).toBe('This code prints a greeting.');
    expect(askGemini).toHaveBeenCalledWith(expect.stringMatching(/Explain this code/i));

    const records = await History.find({ action: 'ai' });
    expect(records).toHaveLength(1);
    expect(records[0].output).toContain('greeting');
    expect(records[0].meta.type).toBe('explain');
    expect(records[0].userId).toBe(userId);
  });

  it('supports freeform questions in ask mode', async () => {
    askGemini.mockResolvedValue('Here is an answer.');

    const response = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'ask', question: 'What is Node.js?' })
      .expect(200);

    expect(response.body.reply).toBe('Here is an answer.');
    expect(askGemini).toHaveBeenCalledWith('What is Node.js?');

    const records = await History.find({ action: 'ai' });
    expect(records).toHaveLength(1);
    expect(records[0].meta.type).toBe('ask');
    expect(records[0].meta.question).toBe('What is Node.js?');
    expect(records[0].code).toBeUndefined();
  });

  it('rejects requests without any prompt material', async () => {
    const response = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'explain' })
      .expect(400);

    expect(response.body.error).toMatch(/Provide code or a question/);
    expect(askGemini).not.toHaveBeenCalled();
  });

  it('requires a question when ask mode is selected', async () => {
    const response = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'ask' })
      .expect(400);

    expect(response.body.error).toMatch(/Ask mode requires a question/);
    expect(askGemini).not.toHaveBeenCalled();
  });

  it('returns 401 when no token provided', async () => {
    await request(app)
      .post('/api/ai')
      .send({ code: "print('Hello')" })
      .expect(401);
  });
});
