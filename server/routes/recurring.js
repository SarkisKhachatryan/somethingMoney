import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Helper function to calculate next occurrence
function calculateNextOccurrence(startDate, frequency, dayOfMonth, dayOfWeek) {
  const date = new Date(startDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      if (dayOfMonth) {
        date.setDate(dayOfMonth);
      }
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

// Get recurring transactions for a family
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

    const recurring = await dbAll(`
      SELECT rt.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM recurring_transactions rt
      JOIN categories c ON rt.category_id = c.id
      JOIN users u ON rt.user_id = u.id
      WHERE rt.family_id = ?
      ORDER BY rt.next_occurrence ASC
    `, [familyId]);

    res.json({ recurring });
  } catch (error) {
    console.error('Get recurring transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create recurring transaction
router.post('/', async (req, res) => {
  try {
    const {
      familyId,
      categoryId,
      type,
      amount,
      description,
      frequency,
      startDate,
      endDate,
      dayOfMonth,
      dayOfWeek
    } = req.body;
    const userId = req.user.userId;

    if (!familyId || !categoryId || !type || !amount || !frequency || !startDate) {
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

    // Calculate next occurrence
    const nextOccurrence = calculateNextOccurrence(startDate, frequency, dayOfMonth, dayOfWeek);

    const result = await dbRun(
      `INSERT INTO recurring_transactions 
       (family_id, user_id, category_id, type, amount, description, frequency, 
        start_date, end_date, next_occurrence, day_of_month, day_of_week) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        familyId,
        userId,
        categoryId,
        type,
        amount,
        description || null,
        frequency,
        startDate,
        endDate || null,
        nextOccurrence,
        dayOfMonth || null,
        dayOfWeek || null
      ]
    );

    const recurring = await dbGet(`
      SELECT rt.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM recurring_transactions rt
      JOIN categories c ON rt.category_id = c.id
      JOIN users u ON rt.user_id = u.id
      WHERE rt.id = ?
    `, [result.lastID]);

    res.status(201).json({ recurring });
  } catch (error) {
    console.error('Create recurring transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update recurring transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      amount,
      description,
      frequency,
      startDate,
      endDate,
      dayOfMonth,
      dayOfWeek,
      isActive
    } = req.body;
    const userId = req.user.userId;

    const recurring = await dbGet('SELECT * FROM recurring_transactions WHERE id = ?', [id]);
    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [recurring.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate next occurrence if frequency or dates changed
    const newStartDate = startDate || recurring.start_date;
    const newFrequency = frequency || recurring.frequency;
    const newDayOfMonth = dayOfMonth !== undefined ? dayOfMonth : recurring.day_of_month;
    const newDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : recurring.day_of_week;
    
    const nextOccurrence = calculateNextOccurrence(
      newStartDate,
      newFrequency,
      newDayOfMonth,
      newDayOfWeek
    );

    await dbRun(
      `UPDATE recurring_transactions 
       SET category_id = ?, amount = ?, description = ?, frequency = ?, 
           start_date = ?, end_date = ?, next_occurrence = ?, 
           day_of_month = ?, day_of_week = ?, is_active = ?
       WHERE id = ?`,
      [
        categoryId || recurring.category_id,
        amount || recurring.amount,
        description !== undefined ? description : recurring.description,
        newFrequency,
        newStartDate,
        endDate !== undefined ? endDate : recurring.end_date,
        nextOccurrence,
        newDayOfMonth,
        newDayOfWeek,
        isActive !== undefined ? isActive : recurring.is_active,
        id
      ]
    );

    const updated = await dbGet(`
      SELECT rt.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM recurring_transactions rt
      JOIN categories c ON rt.category_id = c.id
      JOIN users u ON rt.user_id = u.id
      WHERE rt.id = ?
    `, [id]);

    res.json({ recurring: updated });
  } catch (error) {
    console.error('Update recurring transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete recurring transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const recurring = await dbGet('SELECT * FROM recurring_transactions WHERE id = ?', [id]);
    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [recurring.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM recurring_transactions WHERE id = ?', [id]);
    res.json({ message: 'Recurring transaction deleted' });
  } catch (error) {
    console.error('Delete recurring transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process recurring transactions (create actual transactions from recurring ones)
router.post('/process', async (req, res) => {
  try {
    const { familyId } = req.body;
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all active recurring transactions that are due
    const dueRecurring = await dbAll(`
      SELECT * FROM recurring_transactions
      WHERE family_id = ? 
        AND is_active = 1
        AND next_occurrence <= ?
        AND (end_date IS NULL OR end_date >= next_occurrence)
    `, [familyId, today]);

    const created = [];
    for (const recurring of dueRecurring) {
      // Create transaction
      const transactionResult = await dbRun(
        'INSERT INTO transactions (family_id, user_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          recurring.family_id,
          recurring.user_id,
          recurring.category_id,
          recurring.type,
          recurring.amount,
          recurring.description || null,
          recurring.next_occurrence
        ]
      );

      // Calculate next occurrence
      const nextOccurrence = calculateNextOccurrence(
        recurring.next_occurrence,
        recurring.frequency,
        recurring.day_of_month,
        recurring.day_of_week
      );

      // Update next occurrence
      await dbRun(
        'UPDATE recurring_transactions SET next_occurrence = ? WHERE id = ?',
        [nextOccurrence, recurring.id]
      );

      created.push(transactionResult.lastID);
    }

    res.json({ 
      message: `Created ${created.length} transactions`,
      createdCount: created.length 
    });
  } catch (error) {
    console.error('Process recurring transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

