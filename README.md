# Family Budget Tracker

A comprehensive web application for tracking family budgets, expenses, and financial goals.

## Features

- 👥 **Multi-user Support**: Family members can collaborate on budgets
- 💰 **Budget Management**: Create and manage budgets with customizable categories
- 📊 **Expense Tracking**: Track expenses in real-time with categories
- 💵 **Income Tracking**: Record and categorize income sources
- 🎯 **Goal Setting**: Set and track financial goals
- 📈 **Reports & Analytics**: Visual reports and spending insights
- 🔔 **Notifications**: Bill reminders and budget alerts
- 🔒 **Secure**: JWT-based authentication and data encryption

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (can be upgraded to PostgreSQL)

## Getting Started

1. Install all dependencies:
```bash
npm run install-all
```

2. (Optional) Create a `.env` file in the `server` directory:
```bash
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

3. Start development servers:
```bash
npm run dev
```

4. Access the app:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## First Steps

1. **Register an account** - Create your user account
2. **Create a family** - Set up your first family budget
3. **Add categories** - Go to Settings to create expense and income categories
4. **Set budgets** - Create monthly budgets for your expense categories
5. **Track transactions** - Start adding your income and expenses
6. **Set goals** - Create financial goals and track your progress
7. **Invite family members** - Add other family members to collaborate

## Features Implemented

✅ User authentication (register/login with JWT)
✅ Family management (create families, invite members, roles)
✅ Category management (customizable expense/income categories)
✅ Budget management (monthly budgets per category)
✅ Transaction tracking (income and expenses)
✅ Dashboard with analytics (spending overview, charts)
✅ Goal setting and tracking
✅ Responsive modern UI
✅ Basic notification system (database ready)

## Database

The app uses SQLite by default (database.db file in server directory). For production, consider upgrading to PostgreSQL.

## Project Structure

```
family-budget-tracker/
├── client/          # React frontend
├── server/          # Express backend
└── package.json     # Root package.json
```

