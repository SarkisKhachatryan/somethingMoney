import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get budgets for a family and month/year
router.get('/family/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { month, year } = req.query;
    const userId = req.user.userId;

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const budgets = await dbAll(`
      SELECT b.*, c.name as category_name, c.color, c.icon, c.type
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.family_id = ? AND b.month = ? AND b.year = ?
    `, [familyId, currentMonth, currentYear]);

    res.json({ budgets });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update budget
router.post('/', async (req, res) => {
  try {
    const { familyId, categoryId, amount, month, year } = req.body;
    const userId = req.user.userId;

    if (!familyId || !categoryId || !amount || !month || !year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if budget exists
    const existing = await dbGet(
      'SELECT * FROM budgets WHERE family_id = ? AND category_id = ? AND month = ? AND year = ?',
      [familyId, categoryId, month, year]
    );

    if (existing) {
      await dbRun(
        'UPDATE budgets SET amount = ? WHERE id = ?',
        [amount, existing.id]
      );
      const updated = await dbGet('SELECT * FROM budgets WHERE id = ?', [existing.id]);
      return res.json({ budget: updated });
    } else {
      const result = await dbRun(
        'INSERT INTO budgets (family_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)',
        [familyId, categoryId, amount, month, year]
      );
      const budget = await dbGet('SELECT * FROM budgets WHERE id = ?', [result.lastID]);
      return res.status(201).json({ budget });
    }
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete budget
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const budget = await dbGet('SELECT * FROM budgets WHERE id = ?', [id]);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [budget.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM budgets WHERE id = ?', [id]);
    res.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

