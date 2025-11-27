import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get notifications for a family
router.get('/family/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { unreadOnly } = req.query;
    const userId = req.user.userId;

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT * FROM notifications
      WHERE family_id = ? AND (user_id IS NULL OR user_id = ?)
    `;
    const params = [familyId, userId];

    if (unreadOnly === 'true') {
      query += ' AND read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const notifications = await dbAll(query, params);
    
    // Count unread
    const unreadCount = await dbGet(
      'SELECT COUNT(*) as count FROM notifications WHERE family_id = ? AND (user_id IS NULL OR user_id = ?) AND read = 0',
      [familyId, userId]
    );

    res.json({ 
      notifications,
      unreadCount: unreadCount?.count || 0
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    const userId = req.user.userId;

    const notification = await dbGet('SELECT * FROM notifications WHERE id = ?', [id]);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [notification.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('UPDATE notifications SET read = ? WHERE id = ?', [read !== undefined ? read : 1, id]);
    res.json({ message: 'Notification updated' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/family/:familyId/read-all', async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.userId;

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun(
      'UPDATE notifications SET read = 1 WHERE family_id = ? AND (user_id IS NULL OR user_id = ?)',
      [familyId, userId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await dbGet('SELECT * FROM notifications WHERE id = ?', [id]);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [notification.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

