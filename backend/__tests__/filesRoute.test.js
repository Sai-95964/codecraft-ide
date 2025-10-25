const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../app');
const UserFile = require('../models/userFileModel');

jest.mock('../utils/geminiClient', () => ({
  askGemini: jest.fn()
}));

describe('Files routes', () => {
  let mongo;
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'devsecret');

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    await UserFile.deleteMany();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  it('creates a new manual file when data is valid', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'example.py', content: "print('hello')" })
      .expect(201);

    expect(response.body.filename).toBe('example.py');
    expect(response.body.language).toBe('python');
    expect(response.body.origin).toBe('manual');

    const stored = await UserFile.find();
    expect(stored).toHaveLength(1);
    expect(stored[0].language).toBe('python');
  });

  it('rejects manual files when the language is unsupported', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'script.rb', content: 'puts "hi"' })
      .expect(400);

    expect(response.body.error).toMatch(/Unable to determine language/);
    const stored = await UserFile.find();
    expect(stored).toHaveLength(0);
  });

  it('accepts file uploads for supported types', async () => {
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('public class Main {}'), 'Main.java')
      .expect(201);

    expect(response.body.filename).toBe('Main.java');
    expect(response.body.language).toBe('java');
    expect(response.body.origin).toBe('upload');
  });

  it('rejects uploads with unsupported file extensions', async () => {
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('console.log("hi")'), 'script.js')
      .expect(400);

    expect(response.body.error).toMatch(/Language/);
  });
});
