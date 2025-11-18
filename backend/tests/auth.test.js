const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authRoutes = require('../routes/auth');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('uuid');
jest.mock('nodemailer');
jest.mock('../server/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  }
}));
jest.mock('../schema/schema', () => ({
  users: 'users'
}));
jest.mock('../middleware/validation', () => ({
  validateRegistration: jest.fn((req, res, next) => next()),
  validateLogin: jest.fn((req, res, next) => next()),
}));
jest.mock('../config/redis', () => ({
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

const { db } = require('../server/db');
const { users } = require('../schema/schema');
const redisClient = require('../config/redis');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'user',
        isApproved: false
      };

      // Mock database responses
      db.select.mockResolvedValue([]);
      bcrypt.hash.mockResolvedValue('hashedpassword');
      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser])
        })
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should return 409 if user already exists', async () => {
      db.select.mockResolvedValue([{ id: 1, email: 'test@example.com' }]);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User already registered');
    });

    it('should handle database errors', async () => {
      db.select.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'user',
        isApproved: true
      };

      db.select.mockResolvedValue([mockUser]);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user).toEqual(mockUser);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, role: 'user' },
        process.env.JWT_SECRET
      );
    });

    it('should return 401 for non-existent user', async () => {
      db.select.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not registered');
    });

    it('should return 401 for incorrect password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword'
      };

      db.select.mockResolvedValue([mockUser]);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Incorrect password');
    });

    it('should return 403 for unapproved user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        isApproved: false
      };

      db.select.mockResolvedValue([mockUser]);
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Account not approved yet');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(() => {
      // Mock nodemailer
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({})
      };
      require('nodemailer').createTransport.mockReturnValue(mockTransporter);

      // Mock UUID
      uuidv4.mockReturnValue('mock-reset-token');
    });

    it('should send reset email for existing user', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };

      db.select.mockResolvedValue([mockUser]);
      redisClient.setEx.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'reset_token:mock-reset-token',
        3600,
        expect.any(String)
      );
    });

    it('should handle non-existent user gracefully', async () => {
      db.select.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(redisClient.setEx).not.toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required');
    });

    it('should handle Redis errors', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };

      db.select.mockResolvedValue([mockUser]);
      redisClient.setEx.mockRejectedValue(new Error('Redis error'));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process reset request');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
      bcrypt.hash.mockResolvedValue('newhashedpassword');
    });

    it('should reset password successfully', async () => {
      const tokenData = {
        userId: 1,
        email: 'test@example.com',
        expiry: Date.now() + 3600000
      };

      redisClient.get.mockResolvedValue(JSON.stringify(tokenData));
      db.update.mockResolvedValue({ rowCount: 1 });
      redisClient.del.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(redisClient.del).toHaveBeenCalledWith('reset_token:valid-token');
    });

    it('should return 400 for missing token or password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'token-only' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Token and password are required');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters long');
    });

    it('should return 400 for invalid token', async () => {
      redisClient.get.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should return 400 for expired token', async () => {
      const expiredTokenData = {
        userId: 1,
        email: 'test@example.com',
        expiry: Date.now() - 1000
      };

      redisClient.get.mockResolvedValue(JSON.stringify(expiredTokenData));
      redisClient.del.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Reset token has expired');
      expect(redisClient.del).toHaveBeenCalledWith('reset_token:expired-token');
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify valid token successfully', async () => {
      const mockDecoded = { id: 1 };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        password: 'hashedpassword'
      };

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      db.select.mockResolvedValue([mockUser]);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        role: 'user'
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Token is required');
    });

    it('should return 401 for invalid token', async () => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 for non-existent user', async () => {
      const mockDecoded = { id: 999 };

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      db.select.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found');
    });
  });
});
