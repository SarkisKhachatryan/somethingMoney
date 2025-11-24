import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get transactions for a family
router.get('/family/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { startDate, endDate, categoryId, type } = req.query;
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
      SELECT t.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.family_id = ?
    `;
    const params = [familyId];

    if (startDate) {
      query += ' AND t.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND t.date <= ?';
      params.push(endDate);
    }
    if (categoryId) {
      query += ' AND t.category_id = ?';
      params.push(categoryId);
    }
    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT 100';

    const transactions = await dbAll(query, params);
    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create transaction
router.post('/', async (req, res) => {
  try {
    const { familyId, categoryId, type, amount, description, date } = req.body;
    const userId = req.user.userId;

    if (!familyId || !categoryId || !type || !amount || !date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify category exists and matches type
    const category = await dbGet('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!category || category.type !== type) {
      return res.status(400).json({ error: 'Invalid category or type mismatch' });
    }

    const result = await dbRun(
      'INSERT INTO transactions (family_id, user_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [familyId, userId, categoryId, type, amount, description || null, date]
    );

    const transaction = await dbGet(`
      SELECT t.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [result.lastID]);

    res.status(201).json({ transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, amount, description, date } = req.body;
    const userId = req.user.userId;

    const transaction = await dbGet('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify user is member and can edit (owner or creator)
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [transaction.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun(
      'UPDATE transactions SET category_id = ?, amount = ?, description = ?, date = ? WHERE id = ?',
      [
        categoryId || transaction.category_id,
        amount || transaction.amount,
        description !== undefined ? description : transaction.description,
        date || transaction.date,
        id
      ]
    );

    const updated = await dbGet(`
      SELECT t.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);

    res.json({ transaction: updated });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const transaction = await dbGet('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [transaction.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM transactions WHERE id = ?', [id]);
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

