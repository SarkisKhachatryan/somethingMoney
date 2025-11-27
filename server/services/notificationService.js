import { dbRun, dbGet, dbAll } from '../database.js';

// Create notification
export async function createNotification(familyId, userId, type, title, message) {
  try {
    const result = await dbRun(
      'INSERT INTO notifications (family_id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [familyId, userId, type, title, message]
    );
    return result.lastID;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Create bill reminder notifications from recurring transactions
export async function createBillReminders(familyId) {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Get recurring transactions that are due in the next 3 days
    const dueRecurring = await dbAll(`
      SELECT rt.*, c.name as category_name, u.name as user_name
      FROM recurring_transactions rt
      JOIN categories c ON rt.category_id = c.id
      JOIN users u ON rt.user_id = u.id
      WHERE rt.family_id = ?
        AND rt.is_active = 1
        AND rt.type = 'expense'
        AND rt.next_occurrence >= ?
        AND rt.next_occurrence <= ?
        AND (rt.end_date IS NULL OR rt.end_date >= rt.next_occurrence)
    `, [familyId, todayStr, threeDaysFromNowStr]);

    const created = [];
    for (const recurring of dueRecurring) {
      // Check if notification already exists for this recurring transaction
      const existing = await dbGet(
        'SELECT * FROM notifications WHERE family_id = ? AND type = ? AND message LIKE ? AND created_at >= date("now", "-7 days")',
        [familyId, 'bill_reminder', `%${recurring.description || recurring.category_name}%`]
      );

      if (!existing) {
        const daysUntil = Math.ceil((new Date(recurring.next_occurrence) - today) / (1000 * 60 * 60 * 24));
        const title = daysUntil === 0 ? 'Bill Due Today' : daysUntil === 1 ? 'Bill Due Tomorrow' : `Bill Due in ${daysUntil} Days`;
        const message = `${recurring.description || recurring.category_name} - ${recurring.amount} is due on ${new Date(recurring.next_occurrence).toLocaleDateString()}`;
        
        await createNotification(
          familyId,
          recurring.user_id,
          'bill_reminder',
          title,
          message
        );
        created.push(recurring.id);
      }
    }

    return created;
  } catch (error) {
    console.error('Error creating bill reminders:', error);
    throw error;
  }
}

// Create budget alert notifications
export async function createBudgetAlerts(familyId, month, year) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    // Get categories with budgets and spending
    const budgetAlerts = await dbAll(`
      SELECT 
        c.id,
        c.name,
        b.amount as budgeted,
        COALESCE(SUM(t.amount), 0) as spent,
        b.family_id
      FROM categories c
      JOIN budgets b ON c.id = b.category_id
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.family_id = ?
        AND t.type = 'expense'
        AND t.date >= ?
        AND t.date <= ?
      WHERE b.family_id = ?
        AND b.month = ?
        AND b.year = ?
        AND c.type = 'expense'
      GROUP BY c.id
      HAVING spent > 0
    `, [familyId, startDate, endDate, familyId, month, year]);

    const created = [];
    for (const alert of budgetAlerts) {
      const percentage = (alert.spent / alert.budgeted) * 100;
      
      // Alert at 80% and 100% of budget
      if (percentage >= 100) {
        const existing = await dbGet(
          'SELECT * FROM notifications WHERE family_id = ? AND type = ? AND message LIKE ? AND created_at >= date("now", "-1 days")',
          [familyId, 'budget_alert', `%${alert.name}%`]
        );

        if (!existing) {
          await createNotification(
            familyId,
            null, // Family-wide notification
            'budget_alert',
            'Budget Exceeded',
            `${alert.name} budget exceeded! Spent ${alert.spent.toFixed(2)} of ${alert.budgeted.toFixed(2)} (${percentage.toFixed(1)}%)`
          );
          created.push(alert.id);
        }
      } else if (percentage >= 80) {
        const existing = await dbGet(
          'SELECT * FROM notifications WHERE family_id = ? AND type = ? AND message LIKE ? AND created_at >= date("now", "-1 days")',
          [familyId, 'budget_alert', `%${alert.name}%`]
        );

        if (!existing) {
          await createNotification(
            familyId,
            null,
            'budget_alert',
            'Budget Warning',
            `${alert.name} is at ${percentage.toFixed(1)}% of budget (${alert.spent.toFixed(2)} / ${alert.budgeted.toFixed(2)})`
          );
          created.push(alert.id);
        }
      }
    }

    return created;
  } catch (error) {
    console.error('Error creating budget alerts:', error);
    throw error;
  }
}

