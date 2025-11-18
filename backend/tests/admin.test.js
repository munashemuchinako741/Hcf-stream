const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db');
const { liveStreams, sermons, users } = require('../schema/schema');
const adminRoutes = require('../routes/admin');

// Mock the database
jest.mock('../server/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}));

// Mock the schema
jest.mock('../schema/schema', () => ({
  liveStreams: 'liveStreams',
  sermons: 'sermons',
  users: 'users',
}));

describe('Admin Routes', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(() => {
    // Create test tokens
    adminToken = jwt.sign(
      { id: 1, email: 'admin@test.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret'
    );
    userToken = jwt.sign(
      { id: 2, email: 'user@test.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 403 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 403 when user is not admin', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin stats successfully', async () => {
      // Mock database responses
      db.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([
            { totalViews: 150 }
          ])
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([
            { id: 1, title: 'Test Stream', isLive: true, viewerCount: 25, updatedAt: new Date() }
          ])
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([
            { count: 10 }
          ])
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([
            { id: 1, title: 'Stream 1', type: 'stream', message: 'Stream started: Stream 1', timestamp: new Date() }
          ])
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([
            { id: 1, username: 'testuser', type: 'user', message: 'New user registered: testuser', timestamp: new Date() }
          ])
        });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('activities');
      expect(response.body.stats).toHaveProperty('totalViews', '150');
      expect(response.body.stats).toHaveProperty('activeViewers', '25');
      expect(response.body.stats).toHaveProperty('totalStreams', '10');
      expect(response.body.stats).toHaveProperty('engagementRate', '1500.0%');
    });

    it('should handle database errors', async () => {
      db.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch admin stats');
    });
  });

  describe('POST /api/admin/streams/start', () => {
    it('should start a stream successfully', async () => {
      // Mock database responses
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1, title: 'Test Stream', isLive: true }
          ])
        })
      });

      const response = await request(app)
        .post('/api/admin/streams/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test Stream', description: 'Test Description' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Stream started successfully');
      expect(response.body).toHaveProperty('stream');
      expect(response.body).toHaveProperty('rtmpUrl');
      expect(response.body).toHaveProperty('hlsUrl');
    });

    it('should handle stream start errors', async () => {
      db.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/admin/streams/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test Stream' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to start stream');
    });
  });

  describe('POST /api/admin/streams/stop', () => {
    it('should stop an active stream successfully', async () => {
      // Mock database responses
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { id: 1, title: 'Active Stream' }
            ])
          })
        })
      });

      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 1 }])
        })
      });

      const response = await request(app)
        .post('/api/admin/streams/stop')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Stream stopped successfully');
    });

    it('should return 404 when no active stream found', async () => {
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .post('/api/admin/streams/stop')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No active stream found');
    });
  });

  describe('GET /api/admin/streams/status', () => {
    it('should return stream status when live', async () => {
      const startedAt = new Date(Date.now() - 3600000); // 1 hour ago

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                title: 'Live Stream',
                description: 'Live broadcast',
                startedAt,
                viewerCount: 50
              }
            ])
          })
        })
      });

      const response = await request(app)
        .get('/api/admin/streams/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isLive).toBe(true);
      expect(response.body.stream).toHaveProperty('id', 1);
      expect(response.body.stream).toHaveProperty('title', 'Live Stream');
      expect(response.body.stream).toHaveProperty('duration');
    });

    it('should return not live when no active stream', async () => {
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .get('/api/admin/streams/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isLive).toBe(false);
      expect(response.body.stream).toBe(null);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', username: 'user1', role: 'user', isApproved: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, email: 'user2@test.com', username: 'user2', role: 'admin', isApproved: true, createdAt: new Date(), updatedAt: new Date() }
      ];

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual(mockUsers);
    });
  });

  describe('PATCH /api/admin/users/:id/approve', () => {
    it('should approve user successfully', async () => {
      const mockUser = { id: 1, email: 'user@test.com', isApproved: true, updatedAt: new Date() };

      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUser])
          })
        })
      });

      const response = await request(app)
        .patch('/api/admin/users/1/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User approved successfully');
      expect(response.body.user).toEqual(mockUser);
    });

    it('should return 404 for non-existent user', async () => {
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .patch('/api/admin/users/999/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role successfully', async () => {
      const mockUser = { id: 1, email: 'user@test.com', role: 'admin', updatedAt: new Date() };

      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUser])
          })
        })
      });

      const response = await request(app)
        .patch('/api/admin/users/1/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User role updated to admin successfully');
      expect(response.body.user).toEqual(mockUser);
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .patch('/api/admin/users/1/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid role. Must be "user" or "admin"');
    });
  });

  describe('GET /api/admin/schedule', () => {
    it('should return scheduled events', async () => {
      const mockEvents = [
        { id: 1, title: 'Scheduled Event', scheduledAt: new Date(Date.now() + 86400000) }
      ];

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockEvents)
          })
        })
      });

      const response = await request(app)
        .get('/api/admin/schedule')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.events).toEqual(mockEvents);
    });
  });

  describe('POST /api/admin/schedule', () => {
    it('should create scheduled event successfully', async () => {
      const mockEvent = { id: 1, title: 'New Event', scheduledAt: new Date() };

      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEvent])
        })
      });

      const response = await request(app)
        .post('/api/admin/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Event',
          description: 'Event description',
          scheduledAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event scheduled successfully');
      expect(response.body.event).toEqual(mockEvent);
    });
  });

  describe('DELETE /api/admin/schedule/:id', () => {
    it('should delete scheduled event successfully', async () => {
      db.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 1 })
      });

      const response = await request(app)
        .delete('/api/admin/schedule/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event deleted successfully');
    });
  });
});
