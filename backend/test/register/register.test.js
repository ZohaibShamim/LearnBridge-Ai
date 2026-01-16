import request from 'supertest';
import app from '../../app.js';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let replset;

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  const mongoUri = replset.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

describe('POST /api/v1/users/register', () => {
  it('should register a new user successfully', async () => {
    const userData = {
      email: 'test@examsssple.com',
      password: 'password123',
      firstName: 'Johaaan',
      lastName: 'Daaaoe',
      degree: 'BSc',
      institute: 'Test University',
    };

    const response = await request(app)
      .post('/api/v1/users/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(userData.email);
  });

  it('should return 400 if fields are missing', async () => {
    const incompleteData = {
      email: 'test@example.com',
      password: 'password123',
      // Missing other fields
    };

    const response = await request(app)
      .post('/api/v1/users/register')
      .send(incompleteData)
      .expect(400);

    expect(response.body.message).toContain('All fields are required');
  });

  it('should return 409 if user already exists', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      degree: 'MSc',
      institute: 'Test University',
    };

    await request(app)
      .post('/api/v1/users/register')
      .send(userData)
      .expect(201);

    const response = await request(app)
      .post('/api/v1/users/register')
      .send(userData)
      .expect(409);

    expect(response.body.message).toContain('User with this email already exists');
  });
});