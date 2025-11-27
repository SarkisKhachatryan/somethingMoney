# 💰 Family Budget Tracker

A comprehensive web application for tracking family budgets, expenses, and financial goals. Built with modern technologies to help families manage their finances collaboratively.

![Family Budget Tracker](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)

## ✨ Features

- 👥 **Multi-user Support**: Family members can collaborate on budgets with role-based access (owner, admin, member)
- 💰 **Budget Management**: Create and manage monthly budgets with customizable categories
- 📊 **Expense Tracking**: Track expenses in real-time with categories, descriptions, and dates
- 💵 **Income Tracking**: Record and categorize various income sources
- 🔄 **Recurring Transactions**: Set up recurring bills, subscriptions, and income with automatic processing
- 💱 **Multi-Currency Support**: Support for USD, EUR, AMD, and RUB with real-time exchange rates
- 🎯 **Goal Setting**: Set financial goals with progress tracking and target dates
- 📈 **Reports & Analytics**: Visual reports with charts showing spending by category, budget vs actual
- 🌙 **Dark Mode**: Beautiful dark theme with system preference detection and persistent settings
- 🔔 **Bill Reminders & Notifications**: Automatic bill reminders for upcoming recurring transactions and budget alerts
- 🎨 **Customizable Categories**: Create expense and income categories with custom icons and colors
- 📱 **Responsive Design**: Modern, mobile-friendly UI that works on all devices
- 🔒 **Secure**: JWT-based authentication with password hashing

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Recharts** - Beautiful charts and visualizations
- **Axios** - HTTP client for API calls
- **date-fns** - Date utility library

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **SQLite** - Lightweight database (easily upgradeable to PostgreSQL)
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/SarkisKhachatryan/somethingMoney.git
cd somethingMoney
```

2. **Install all dependencies**
```bash
npm run install-all
```

This will install dependencies for:
- Root project (concurrently for running both servers)
- Backend server
- Frontend client

3. **Configure environment variables (Optional)**

Create a `.env` file in the `server` directory:
```bash
cd server
touch .env
```

Add the following:
```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

**Note**: For production, use a strong, random JWT_SECRET.

4. **Start development servers**
```bash
npm run dev
```

This will start both:
- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:5173

### First Steps After Launch

1. **Register an account** - Create your user account at the registration page
2. **Create a family** - Set up your first family budget group
3. **Add categories** - Go to Settings to create expense and income categories
4. **Set budgets** - Create monthly budgets for your expense categories
5. **Track transactions** - Start adding your income and expenses
6. **Set up recurring transactions** - Create recurring bills, subscriptions, and income
7. **Set goals** - Create financial goals and track your progress
8. **Invite family members** - Add other family members by email to collaborate

## 📁 Project Structure

```
somethingMoney/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context (Auth)
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   ├── database.js         # Database setup
│   ├── index.js            # Server entry point
│   └── package.json
├── .gitignore
├── package.json            # Root package.json
└── README.md
```

## 🗄️ Database Schema

The application uses SQLite with the following main tables:

- **users** - User accounts and authentication
- **families** - Family groups
- **family_members** - User-family relationships with roles
- **categories** - Expense and income categories
- **budgets** - Monthly budget allocations
- **transactions** - Income and expense records
- **recurring_transactions** - Recurring bills, subscriptions, and income
- **goals** - Financial goals
- **notifications** - System notifications

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Family Management
- `GET /api/family` - Get user's families
- `POST /api/family` - Create new family
- `GET /api/family/:id` - Get family details
- `POST /api/family/:id/members` - Add family member

### Categories
- `GET /api/categories/family/:familyId` - Get categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Budgets
- `GET /api/budget/family/:familyId` - Get budgets
- `POST /api/budget` - Create/update budget
- `DELETE /api/budget/:id` - Delete budget

### Transactions
- `GET /api/transactions/family/:familyId` - Get transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Goals
- `GET /api/goals/family/:familyId` - Get goals
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Recurring Transactions
- `GET /api/recurring/family/:familyId` - Get recurring transactions
- `POST /api/recurring` - Create recurring transaction
- `PUT /api/recurring/:id` - Update recurring transaction
- `DELETE /api/recurring/:id` - Delete recurring transaction
- `POST /api/recurring/process` - Process due recurring transactions

### Currency
- `GET /api/currency/rates` - Get exchange rates
- `GET /api/currency/convert` - Convert amount between currencies
- `GET /api/currency/family/:familyId` - Get family currency info
- `PUT /api/family/:id/currency` - Update family currency

### Notifications
- `GET /api/notifications/family/:familyId` - Get notifications
- `PUT /api/notifications/:id/read` - Mark notification as read/unread
- `PUT /api/notifications/family/:familyId/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

### Dashboard
- `GET /api/dashboard/family/:familyId` - Get dashboard data

## 🎨 Features in Detail

### Dashboard
- Monthly income and expense summary
- Balance calculation
- Spending by category (pie chart)
- Budget vs actual spending (bar chart)
- Recent transactions list
- Active goals with progress bars

### Budget Management
- Set monthly budgets per category
- View budget vs actual spending
- Edit and delete budgets
- Month/year navigation

### Transaction Tracking
- Add income and expenses
- Categorize transactions
- Add descriptions and dates
- Edit and delete transactions
- Filter by date, category, type

### Goal Setting
- Create financial goals
- Set target amounts and dates
- Track progress with visual progress bars
- Personal or family goals

### Recurring Transactions
- Set up recurring bills, subscriptions, and income
- Support for daily, weekly, monthly, and yearly frequencies
- Schedule by day of week or day of month
- Pause/resume recurring transactions
- Automatic transaction creation from recurring items
- Set start and end dates for recurring transactions

### Settings
- Manage family members
- Create custom categories
- Customize category icons and colors
- Set default currency for family (USD, EUR, AMD, RUB)
- Role-based access control

### Multi-Currency Support
- Support for USD ($), EUR (€), AMD (֏), and RUB (₽)
- Real-time exchange rates from exchangerate-api.com
- Automatic currency formatting across all pages
- Exchange rate caching (1 hour TTL)
- Set currency per family in Settings

### Bill Reminders & Notifications
- Automatic bill reminders for recurring transactions due in next 3 days
- Budget alerts when spending reaches 80% or exceeds budget
- Notification panel with unread indicator
- Mark notifications as read/unread
- Delete notifications
- Real-time notification updates
- Notification types: bill reminders, budget alerts, goal milestones

### Dark Mode
- Toggle between light and dark themes
- Automatic system preference detection
- Persistent theme preference (saved in localStorage)
- Smooth color transitions
- All UI components support both themes

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Protected API routes
- Input validation
- SQL injection prevention (parameterized queries)

## 🚀 Deployment

### Production Considerations

1. **Database**: Consider upgrading to PostgreSQL for production
2. **Environment Variables**: Set secure JWT_SECRET
3. **HTTPS**: Use HTTPS in production
4. **CORS**: Configure CORS properly for your domain
5. **Error Handling**: Add comprehensive error logging
6. **Backup**: Set up database backups

### Build for Production

```bash
# Build frontend
cd client
npm run build

# The built files will be in client/dist/
# Serve with a static file server or integrate with Express
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Sargis Khachatryan**

- GitHub: [@SarkisKhachatryan](https://github.com/SarkisKhachatryan)
- LinkedIn: [sargis-kh](https://www.linkedin.com/in/sargis-kh)

## 🙏 Acknowledgments

- Inspired by popular budget tracking apps like YNAB, Goodbudget, and Monarch Money
- Built with modern web technologies for optimal performance and user experience

## 📊 Roadmap

- [x] Recurring transactions ✅
- [x] Dark mode ✅
- [x] Multi-currency support ✅
- [ ] Bill reminders with notifications
- [ ] Export data (CSV, PDF)
- [ ] Mobile app (React Native)
- [ ] Bank account integration
- [ ] Advanced analytics and forecasting

---

⭐ If you find this project helpful, please give it a star!
