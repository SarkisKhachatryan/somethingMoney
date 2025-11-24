import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dbGet, dbAll } from '../database.js';

const router = express.Router();
router.use(authenticateToken);

// Get dashboard data
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

    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();

    // Get total income and expenses for the month
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const incomeResult = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE family_id = ? AND type = 'income' AND date >= ? AND date <= ?
    `, [familyId, startDate, endDate]);

    const expenseResult = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE family_id = ? AND type = 'expense' AND date >= ? AND date <= ?
    `, [familyId, startDate, endDate]);

    // Get budget totals
    const budgetResult = await dbGet(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.type = 'expense' THEN b.amount ELSE 0 END), 0) as expense_budget,
        COALESCE(SUM(CASE WHEN c.type = 'income' THEN b.amount ELSE 0 END), 0) as income_budget
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.family_id = ? AND b.month = ? AND b.year = ?
    `, [familyId, currentMonth, currentYear]);

    // Get spending by category
    const spendingByCategory = await dbAll(`
      SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        COALESCE(SUM(t.amount), 0) as spent,
        COALESCE(b.amount, 0) as budgeted
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.family_id = ? 
        AND t.type = 'expense'
        AND t.date >= ? 
        AND t.date <= ?
      LEFT JOIN budgets b ON c.id = b.category_id 
        AND b.family_id = ?
        AND b.month = ?
        AND b.year = ?
      WHERE c.family_id = ? AND c.type = 'expense'
      GROUP BY c.id
      HAVING spent > 0 OR budgeted > 0
      ORDER BY spent DESC
    `, [familyId, startDate, endDate, familyId, currentMonth, currentYear, familyId]);

    // Get recent transactions
    const recentTransactions = await dbAll(`
      SELECT t.*, c.name as category_name, c.color, c.icon, u.name as user_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.family_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `, [familyId]);

    // Get active goals
    const goals = await dbAll(`
      SELECT g.*, u.name as user_name
      FROM goals g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.family_id = ? AND (g.current_amount < g.target_amount OR g.target_date >= date('now'))
      ORDER BY g.target_date ASC
      LIMIT 5
    `, [familyId]);

    const totalIncome = parseFloat(incomeResult.total) || 0;
    const totalExpenses = parseFloat(expenseResult.total) || 0;
    const expenseBudget = parseFloat(budgetResult.expense_budget) || 0;
    const incomeBudget = parseFloat(budgetResult.income_budget) || 0;

    res.json({
      summary: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        expenseBudget,
        incomeBudget,
        expenseBudgetUsed: expenseBudget > 0 ? (totalExpenses / expenseBudget) * 100 : 0,
        month: currentMonth,
        year: currentYear
      },
      spendingByCategory,
      recentTransactions,
      goals
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

