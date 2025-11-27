/**
 * Black Box Tests for Notifications Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import notificationRoutes from '../../routes/notification.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import { dbRun } from '../../database.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/notifications', notificationRoutes);

describe('Notifications Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let notificationId;

  beforeAll(async () => {
    const testUser = {
      email: `notificationtest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Notification Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Notification Test Family' });
    familyId = familyResponse.body.family.id;

    // Create a test notification
    const userId = registerResponse.body.user.id;
    const result = await dbRun(
      'INSERT INTO notifications (family_id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [familyId, userId, 'bill_reminder', 'Test Bill', 'Test notification message']
    );
    notificationId = result.lastID;
  });

  describe('GET /api/notifications/family/:familyId', () => {
    test('should get all notifications for family', async () => {
      const response = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('unreadCount');
      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(typeof response.body.unreadCount).toBe('number');
    });

    test('should filter unread notifications only', async () => {
      const response = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ unreadOnly: 'true' })
        .expect(200);

      expect(response.body.notifications).toBeDefined();
      // All returned notifications should be unread
      response.body.notifications.forEach(notification => {
        expect(notification.read).toBe(0);
      });
    });

    test('should return unread count', async () => {
      const response = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.unreadCount).toBeGreaterThanOrEqual(0);
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .expect(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    test('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ read: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    test('should mark notification as unread', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ read: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    test('should default to read when read parameter not provided', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    test('should reject update of non-existent notification', async () => {
      const response = await request(app)
        .put('/api/notifications/99999/read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ read: 1 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other2${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User 2'
        });

      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({ read: 1 })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/notifications/family/:familyId/read-all', () => {
    test('should mark all notifications as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/family/${familyId}/read-all`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('marked as read');
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other3${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User 3'
        });

      const response = await request(app)
        .put(`/api/notifications/family/${familyId}/read-all`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    let deleteNotificationId;

    beforeEach(async () => {
      // Get current user ID
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      const userId = meResponse.body.user.id;

      // Create a notification to delete
      const result = await dbRun(
        'INSERT INTO notifications (family_id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
        [familyId, userId, 'budget_alert', 'Delete Test', 'This will be deleted']
      );
      deleteNotificationId = result.lastID;
    });

    test('should delete notification', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${deleteNotificationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const found = getResponse.body.notifications.find(n => n.id === deleteNotificationId);
      expect(found).toBeUndefined();
    });

    test('should reject delete of non-existent notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other4${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User 4'
        });

      const response = await request(app)
        .delete(`/api/notifications/${deleteNotificationId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});

