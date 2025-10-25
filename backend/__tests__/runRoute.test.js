const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../app');
const History = require('../models/historyModel');
const UserFile = require('../models/userFileModel');
const axios = require('axios');

jest.mock('axios');

describe('POST /api/run', () => {
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
  await UserFile.deleteMany();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  it('executes code via Piston and records history', async () => {
    axios.post.mockResolvedValue({
      data: {
        language: 'python',
        version: '3.10.0',
        run: {
          stdout: 'Hello from test',
          stderr: '',
          code: 0,
          output: 'Hello from test'
        }
      }
    });

    const response = await request(app)
      .post('/api/run')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'python', code: "print('Hello from test')" })
      .expect(200);

  expect(response.body.run).toBeDefined();
  expect(response.body.run.run.stdout).toBe('Hello from test');
    expect(axios.post).toHaveBeenCalledTimes(1);

    const records = await History.find({ action: 'run' });
    expect(records).toHaveLength(1);
    expect(records[0].output).toContain('Hello from test');
    expect(records[0].userId).toBe(userId);
  });

  it('saves a generated file when requested', async () => {
    axios.post.mockResolvedValue({
      data: {
        language: 'python',
        version: '3.10.0',
        run: {
          stdout: 'Saved output',
          stderr: '',
          code: 0,
          output: 'Saved output'
        }
      }
    });

    const response = await request(app)
      .post('/api/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        language: 'python',
        code: "print('Save me')",
        saveFile: { filename: 'main.py' }
      })
      .expect(200);

    expect(response.body.savedFile).toBeDefined();
    expect(response.body.savedFile.language).toBe('python');

    const storedFiles = await UserFile.find();
    expect(storedFiles).toHaveLength(1);
    expect(storedFiles[0].filename).toBe('main.py');
  });

  it('rejects file saves that use unsupported extensions', async () => {
    axios.post.mockResolvedValue({
      data: {
        language: 'python',
        version: '3.10.0',
        run: {
          stdout: 'Hello',
          stderr: '',
          code: 0,
          output: 'Hello'
        }
      }
    });

    const response = await request(app)
      .post('/api/run')
      .set('Authorization', `Bearer ${token}`)
      .send({
        language: 'python',
        code: "print('oops')",
        saveFile: { filename: 'script.js' }
      })
      .expect(400);

    expect(response.body.error).toMatch(/File save failed/);

    const histories = await History.find();
    expect(histories).toHaveLength(0);
    const files = await UserFile.find();
    expect(files).toHaveLength(0);
  });

  it('rejects unsupported languages with a 400', async () => {
    const response = await request(app)
      .post('/api/run')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'brainfuck', code: '++>-' })
      .expect(400);

    expect(response.body.error).toMatch(/Unsupported language/);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('returns 401 when no token provided', async () => {
    await request(app)
      .post('/api/run')
      .send({ language: 'python', code: "print('Hello')" })
      .expect(401);
  });
});
