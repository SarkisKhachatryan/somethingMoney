import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get goals for a family
router.get('/family/:familyId', async (req, res) => {
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

    const goals = await dbAll(`
      SELECT g.*, u.name as user_name
      FROM goals g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.family_id = ?
      ORDER BY g.created_at DESC
    `, [familyId]);

    res.json({ goals });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create goal
router.post('/', async (req, res) => {
  try {
    const { familyId, userId: goalUserId, name, targetAmount, currentAmount, targetDate, description } = req.body;
    const userId = req.user.userId;

    if (!familyId || !name || !targetAmount) {
      return res.status(400).json({ error: 'Family ID, name, and target amount are required' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await dbRun(
      'INSERT INTO goals (family_id, user_id, name, target_amount, current_amount, target_date, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [familyId, goalUserId || null, name, targetAmount, currentAmount || 0, targetDate || null, description || null]
    );

    const goal = await dbGet(`
      SELECT g.*, u.name as user_name
      FROM goals g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.id = ?
    `, [result.lastID]);

    res.status(201).json({ goal });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, currentAmount, targetDate, description } = req.body;
    const userId = req.user.userId;

    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [id]);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [goal.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun(
      'UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, description = ? WHERE id = ?',
      [
        name || goal.name,
        targetAmount || goal.target_amount,
        currentAmount !== undefined ? currentAmount : goal.current_amount,
        targetDate !== undefined ? targetDate : goal.target_date,
        description !== undefined ? description : goal.description,
        id
      ]
    );

    const updated = await dbGet(`
      SELECT g.*, u.name as user_name
      FROM goals g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.id = ?
    `, [id]);

    res.json({ goal: updated });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [id]);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [goal.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM goals WHERE id = ?', [id]);
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

