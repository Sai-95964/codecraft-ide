const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/userModel');

describe('Auth routes', () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    await User.deleteMany();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  it('registers a user and returns token plus profile', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Demo User', email: 'demo@example.com', password: 'Secret123!' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      name: 'Demo User',
      email: 'demo@example.com',
      username: 'demo@example.com'
    });
  });

  it('allows login and fetches current user via /me', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Demo User', email: 'demo@example.com', password: 'Secret123!' })
      .expect(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@example.com', password: 'Secret123!' })
      .expect(200);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .expect(200);

    expect(meRes.body.user).toMatchObject({
      email: 'demo@example.com',
      username: 'demo@example.com'
    });
  });

  it('rejects /me without auth', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });
});
