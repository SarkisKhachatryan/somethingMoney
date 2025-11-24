import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Create family
router.post('/', async (req, res) => {
  try {
    const { name, currency = 'USD' } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ error: 'Family name is required' });
    }

    const validCurrencies = ['USD', 'EUR', 'AMD', 'RUB'];
    const familyCurrency = validCurrencies.includes(currency) ? currency : 'USD';

    const result = await dbRun('INSERT INTO families (name, currency) VALUES (?, ?)', [name, familyCurrency]);
    const familyId = result.lastID;

    // Add creator as owner
    await dbRun(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [familyId, userId, 'owner']
    );

    const family = await dbGet('SELECT * FROM families WHERE id = ?', [familyId]);
    res.status(201).json({ family });
  } catch (error) {
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's families
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const families = await dbAll(`
      SELECT f.*, fm.role 
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      WHERE fm.user_id = ?
    `, [userId]);

    res.json({ families });
  } catch (error) {
    console.error('Get families error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get family details
router.get('/:id', async (req, res) => {
  try {
    const familyId = req.params.id;
    const userId = req.user.userId;

    // Check if user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const family = await dbGet('SELECT * FROM families WHERE id = ?', [familyId]);
    const members = await dbAll(`
      SELECT u.id, u.name, u.email, fm.role, fm.joined_at
      FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      WHERE fm.family_id = ?
    `, [familyId]);

    res.json({ family, members, userRole: member.role });
  } catch (error) {
    console.error('Get family error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update family currency
router.put('/:id/currency', async (req, res) => {
  try {
    const { id } = req.params;
    const { currency } = req.body;
    const userId = req.user.userId;

    const validCurrencies = ['USD', 'EUR', 'AMD', 'RUB'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    // Check if user is owner or admin
    const member = await dbGet(
      'SELECT role FROM family_members WHERE family_id = ? AND user_id = ?',
      [id, userId]
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only owners and admins can change currency' });
    }

    await dbRun('UPDATE families SET currency = ? WHERE id = ?', [currency, id]);
    const family = await dbGet('SELECT * FROM families WHERE id = ?', [id]);

    res.json({ family });
  } catch (error) {
    console.error('Update currency error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to family (by email)
router.post('/:id/members', async (req, res) => {
  try {
    const familyId = req.params.id;
    const userId = req.user.userId;
    const { email, role = 'member' } = req.body;

    // Check if requester is owner or admin
    const requester = await dbGet(
      'SELECT role FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      return res.status(403).json({ error: 'Only owners and admins can add members' });
    }

    // Find user by email
    const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const existing = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, user.id]
    );

    if (existing) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    await dbRun(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [familyId, user.id, role]
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

