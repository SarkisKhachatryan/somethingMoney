import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getExchangeRates, convertCurrency, formatCurrency, getCurrencySymbol } from '../services/exchangeRate.js';
import { dbGet } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get exchange rates
router.get('/rates', async (req, res) => {
  try {
    const { base = 'USD' } = req.query;
    const rates = await getExchangeRates(base);
    res.json({ base, rates });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Convert amount between currencies
router.get('/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Amount, from, and to currencies are required' });
    }

    const rates = await getExchangeRates(from);
    const converted = convertCurrency(parseFloat(amount), from, to, rates);

    res.json({
      original: parseFloat(amount),
      converted: converted,
      from: from,
      to: to,
      formatted: {
        from: formatCurrency(amount, from),
        to: formatCurrency(converted, to)
      }
    });
  } catch (error) {
    console.error('Convert currency error:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// Get currency info for a family
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

    const family = await dbGet('SELECT currency FROM families WHERE id = ?', [familyId]);
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const currency = family.currency || 'USD';
    const rates = await getExchangeRates(currency);

    res.json({
      currency,
      symbol: getCurrencySymbol(currency),
      rates
    });
  } catch (error) {
    console.error('Get family currency error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

