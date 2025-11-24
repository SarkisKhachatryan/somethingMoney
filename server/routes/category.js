import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get categories for a family
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

    const categories = await dbAll(
      'SELECT * FROM categories WHERE family_id = ? ORDER BY name',
      [familyId]
    );

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { familyId, name, type, color, icon } = req.body;
    const userId = req.user.userId;

    if (!familyId || !name || !type) {
      return res.status(400).json({ error: 'Family ID, name, and type are required' });
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
      'INSERT INTO categories (family_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)',
      [familyId, name, type, color || '#3B82F6', icon || '💰']
    );

    const category = await dbGet('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    res.status(201).json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const userId = req.user.userId;

    // Get category and verify access
    const category = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [category.family_id, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun(
      'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
      [name || category.name, color || category.color, icon || category.icon, id]
    );

    const updated = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    res.json({ category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const category = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [category.family_id, userId]
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only owners and admins can delete categories' });
    }

    await dbRun('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

