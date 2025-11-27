import PDFDocument from 'pdfkit';
import { dbAll, dbGet } from '../database.js';
import { formatCurrency, getCurrencySymbol } from './exchangeRate.js';

// Export transactions to CSV
export async function exportTransactionsToCSV(familyId, startDate, endDate, currency = 'USD') {
  try {
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

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    const transactions = await dbAll(query, params);

    // Generate CSV
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'User'];
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.category_name,
      t.amount,
      t.description || '',
      t.user_name
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    throw error;
  }
}

// Export transactions to PDF
export async function exportTransactionsToPDF(familyId, startDate, endDate, currency = 'USD') {
  return new Promise(async (resolve, reject) => {
    try {
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

      query += ' ORDER BY t.date DESC, t.created_at DESC';

      const transactions = await dbAll(query, params);
      const family = await dbGet('SELECT name FROM families WHERE id = ?', [familyId]);

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Transaction Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Family: ${family?.name || 'Unknown'}`, { align: 'center' });
      if (startDate || endDate) {
        doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'End'}`, { align: 'center' });
      }
      doc.moveDown(2);

      // Summary
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10);
      doc.text(`Total Income: ${formatCurrency(totalIncome, currency)}`);
      doc.text(`Total Expenses: ${formatCurrency(totalExpenses, currency)}`);
      doc.text(`Balance: ${formatCurrency(totalIncome - totalExpenses, currency)}`);
      doc.moveDown(2);

      // Transactions table
      doc.fontSize(14).text('Transactions', { underline: true });
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(9);
      doc.text('Date', 50, tableTop);
      doc.text('Type', 120, tableTop);
      doc.text('Category', 170, tableTop);
      doc.text('Amount', 280, tableTop, { width: 100, align: 'right' });
      doc.text('Description', 390, tableTop, { width: 150 });

      let y = tableTop + 20;
      transactions.forEach(transaction => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        doc.text(new Date(transaction.date).toLocaleDateString(), 50, y);
        doc.text(transaction.type, 120, y);
        doc.text(transaction.category_name, 170, y, { width: 100 });
        const amount = formatCurrency(transaction.amount, currency);
        doc.text(transaction.type === 'expense' ? `-${amount}` : `+${amount}`, 280, y, { width: 100, align: 'right' });
        doc.text(transaction.description || '-', 390, y, { width: 150 });
        y += 15;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Export budget report to PDF
export async function exportBudgetReportToPDF(familyId, month, year, currency = 'USD') {
  return new Promise(async (resolve, reject) => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const budgets = await dbAll(`
        SELECT b.*, c.name as category_name, c.color, c.icon, c.type,
               COALESCE(SUM(t.amount), 0) as spent
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        LEFT JOIN transactions t ON c.id = t.category_id 
          AND t.family_id = ?
          AND t.type = 'expense'
          AND t.date >= ?
          AND t.date <= ?
        WHERE b.family_id = ? AND b.month = ? AND b.year = ?
        GROUP BY b.id
      `, [familyId, startDate, endDate, familyId, month, year]);

      const family = await dbGet('SELECT name FROM families WHERE id = ?', [familyId]);

      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Budget Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Family: ${family?.name || 'Unknown'}`, { align: 'center' });
      doc.text(`Month: ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      const totalBudgeted = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent), 0);

      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10);
      doc.text(`Total Budgeted: ${formatCurrency(totalBudgeted, currency)}`);
      doc.text(`Total Spent: ${formatCurrency(totalSpent, currency)}`);
      doc.text(`Remaining: ${formatCurrency(totalBudgeted - totalSpent, currency)}`);
      doc.text(`Usage: ${totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}%`);
      doc.moveDown(2);

      // Budget details
      doc.fontSize(14).text('Budget Details', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(9);
      doc.text('Category', 50, tableTop);
      doc.text('Budgeted', 200, tableTop, { width: 100, align: 'right' });
      doc.text('Spent', 310, tableTop, { width: 100, align: 'right' });
      doc.text('Remaining', 420, tableTop, { width: 100, align: 'right' });
      doc.text('Usage %', 530, tableTop, { width: 80, align: 'right' });

      let y = tableTop + 20;
      budgets.forEach(budget => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        const spent = parseFloat(budget.spent);
        const budgeted = parseFloat(budget.amount);
        const remaining = budgeted - spent;
        const usage = budgeted > 0 ? (spent / budgeted) * 100 : 0;

        doc.text(budget.category_name, 50, y, { width: 140 });
        doc.text(formatCurrency(budgeted, currency), 200, y, { width: 100, align: 'right' });
        doc.text(formatCurrency(spent, currency), 310, y, { width: 100, align: 'right' });
        doc.text(formatCurrency(remaining, currency), 420, y, { width: 100, align: 'right' });
        doc.text(`${usage.toFixed(1)}%`, 530, y, { width: 80, align: 'right' });
        y += 15;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

