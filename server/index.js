import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import familyRoutes from './routes/family.js';
import budgetRoutes from './routes/budget.js';
import transactionRoutes from './routes/transaction.js';
import categoryRoutes from './routes/category.js';
import goalRoutes from './routes/goal.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notification.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase().then(() => {
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/family', familyRoutes);
  app.use('/api/budget', budgetRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Family Budget Tracker API' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

