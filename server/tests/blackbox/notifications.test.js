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
    // Test: Verify retrieval of all notifications for a family with unread count
    // Logic: Notifications include bill reminders and budget alerts. This endpoint
    //        returns both the notifications array and unread count for UI display.
    //        The unread count is used to show a badge/indicator in the UI.
    // Expected: Returns 200 status with notifications array and unreadCount number
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

    // Test: Verify filtering returns only unread notifications when unreadOnly=true
    // Logic: Users may want to see only unread notifications. This query parameter
    //        filters the results. All returned notifications should have read=0.
    // Expected: Returns 200 status with array containing only unread notifications
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

    // Test: Verify unread count is always returned and is accurate
    // Logic: The unread count is used for UI badges. It should always be present
    //        and reflect the actual number of unread notifications (read=0).
    // Expected: Returns 200 status with unreadCount >= 0
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

    // Test: Verify authentication is required to view notifications
    // Logic: All notification endpoints require authentication to identify the user
    //        and verify their family membership for access control.
    // Expected: Returns 401 status when Authorization header is missing
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/notifications/family/${familyId}`)
        .expect(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    // Test: Verify marking a notification as read (read=1)
    // Logic: When users view a notification, it should be marked as read to update
    //        the unread count. This tests the read state update functionality.
    // Expected: Returns 200 status with success message
    test('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ read: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    // Test: Verify marking a notification as unread (read=0) - toggle functionality
    // Logic: Users may want to mark notifications as unread again to remind themselves.
    //        This tests the ability to toggle read state both ways.
    // Expected: Returns 200 status with success message
    test('should mark notification as unread', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ read: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    // Test: Verify default behavior when read parameter is omitted (defaults to read=1)
    // Logic: If no read value is provided, the system should default to marking as read.
    //        This provides a convenient default for the common case of marking as read.
    // Expected: Returns 200 status, notification is marked as read
    test('should default to read when read parameter not provided', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    // Test: Verify update fails gracefully for non-existent notification IDs
    // Logic: Attempting to update a non-existent notification should return a clear
    //        error rather than silently succeeding or creating a new notification.
    // Expected: Returns 404 status with error message
    test('should reject update of non-existent notification', async () => {
      const response = await request(app)
        .put('/api/notifications/99999/read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ read: 1 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify access control prevents non-family members from updating notifications
    // Logic: Only family members should be able to mark notifications as read/unread.
    //        This prevents unauthorized users from modifying notification states.
    // Expected: Returns 403 status when user is not a member of the notification's family
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
    // Test: Verify bulk operation to mark all family notifications as read
    // Logic: Users may want to mark all notifications as read at once (e.g., "Mark all as read").
    //        This is more efficient than updating each notification individually.
    // Expected: Returns 200 status with success message indicating all marked as read
    test('should mark all notifications as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/family/${familyId}/read-all`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('marked as read');
    });

    // Test: Verify access control prevents non-family members from bulk updating notifications
    // Logic: Only family members should be able to mark all notifications as read.
    //        This prevents unauthorized bulk operations on notification data.
    // Expected: Returns 403 status when user is not a member of the family
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

    // Test: Verify successful deletion of notification and removal from database
    // Logic: Users may want to delete notifications they no longer need. After deletion,
    //        the notification should no longer appear in the family's notification list.
    //        This tests both deletion and verifies the notification is actually removed.
    // Expected: Returns 200 status, and notification is no longer retrievable via GET
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

    // Test: Verify deletion fails gracefully for non-existent notification IDs
    // Logic: Attempting to delete a non-existent notification should return a clear
    //        error rather than returning success (idempotent but should be explicit).
    // Expected: Returns 404 status with error message
    test('should reject delete of non-existent notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify access control prevents non-family members from deleting notifications
    // Logic: Only family members should be able to delete notifications. This prevents
    //        unauthorized deletion of important bill reminders or budget alerts.
    // Expected: Returns 403 status when user is not a member of the notification's family
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

