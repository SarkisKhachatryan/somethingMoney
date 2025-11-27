import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbGet } from '../database.js';
import {
  exportTransactionsToCSV,
  exportTransactionsToPDF,
  exportBudgetReportToPDF
} from '../services/exportService.js';

const router = express.Router();
router.use(authenticateToken);

// Export transactions to CSV
router.get('/transactions/csv', async (req, res) => {
  try {
    const { familyId, startDate, endDate } = req.query;
    const userId = req.user.userId;

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const family = await dbGet('SELECT currency FROM families WHERE id = ?', [familyId]);
    const currency = family?.currency || 'USD';

    const csv = await exportTransactionsToCSV(familyId, startDate, endDate, currency);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export transactions CSV error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});

// Export transactions to PDF
router.get('/transactions/pdf', async (req, res) => {
  try {
    const { familyId, startDate, endDate } = req.query;
    const userId = req.user.userId;

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const family = await dbGet('SELECT currency FROM families WHERE id = ?', [familyId]);
    const currency = family?.currency || 'USD';

    const pdf = await exportTransactionsToPDF(familyId, startDate, endDate, currency);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.pdf`);
    res.send(pdf);
  } catch (error) {
    console.error('Export transactions PDF error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});

// Export budget report to PDF
router.get('/budget/pdf', async (req, res) => {
  try {
    const { familyId, month, year } = req.query;
    const userId = req.user.userId;

    if (!familyId || !month || !year) {
      return res.status(400).json({ error: 'Family ID, month, and year are required' });
    }

    // Verify user is member
    const member = await dbGet(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const family = await dbGet('SELECT currency FROM families WHERE id = ?', [familyId]);
    const currency = family?.currency || 'USD';

    const pdf = await exportBudgetReportToPDF(familyId, parseInt(month), parseInt(year), currency);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=budget-report-${month}-${year}-${Date.now()}.pdf`);
    res.send(pdf);
  } catch (error) {
    console.error('Export budget PDF error:', error);
    res.status(500).json({ error: 'Failed to export budget report' });
  }
});

export default router;

