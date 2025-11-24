import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/currency';
import './Dashboard.css';

function Dashboard() {
  const [familyId, setFamilyId] = useState(null);
  const [families, setFamilies] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchDashboardData();
      // Update currency when family changes
      const selectedFamily = families.find(f => f.id === familyId);
      if (selectedFamily) {
        setCurrency(selectedFamily.currency || 'USD');
      }
    }
  }, [familyId, month, year, families]);

  const fetchFamilies = async () => {
    try {
      const response = await axios.get('/api/family');
      setFamilies(response.data.families);
      if (response.data.families.length > 0 && !familyId) {
        const firstFamily = response.data.families[0];
        setFamilyId(firstFamily.id);
        setCurrency(firstFamily.currency || 'USD');
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`/api/dashboard/family/${familyId}`, {
        params: { month, year }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const createFamily = async () => {
    const name = prompt('Enter family name:');
    if (!name) return;

    try {
      const response = await axios.post('/api/family', { name });
      await fetchFamilies();
      setFamilyId(response.data.family.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create family');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (families.length === 0) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <h2>Welcome to Family Budget Tracker!</h2>
          <p>Get started by creating your first family</p>
          <button onClick={createFamily} className="primary-btn">
            Create Family
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const { summary, spendingByCategory, recentTransactions, goals } = dashboardData;

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const categoryChartData = spendingByCategory.map(cat => ({
    name: cat.name,
    value: parseFloat(cat.spent)
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <select
            value={familyId}
            onChange={(e) => {
              const newFamilyId = Number(e.target.value);
              setFamilyId(newFamilyId);
              const selectedFamily = families.find(f => f.id === newFamilyId);
              if (selectedFamily) {
                setCurrency(selectedFamily.currency || 'USD');
              }
            }}
            className="family-select"
          >
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="date-selector">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card income">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Income</h3>
            <p className="amount">{formatCurrency(summary.totalIncome, currency)}</p>
          </div>
        </div>
        <div className="summary-card expense">
          <div className="card-icon">💸</div>
          <div className="card-content">
            <h3>Expenses</h3>
            <p className="amount">{formatCurrency(summary.totalExpenses, currency)}</p>
            {summary.expenseBudget > 0 && (
              <p className="budget-info">
                {summary.expenseBudgetUsed.toFixed(1)}% of budget
              </p>
            )}
          </div>
        </div>
        <div className="summary-card balance">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <h3>Balance</h3>
            <p className={`amount ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.balance, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Spending by Category</h2>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-message">No spending data for this month</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Budget vs Spending</h2>
          {spendingByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
                <Bar dataKey="spent" fill="#ef4444" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-message">No budget data for this month</p>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Recent Transactions</h2>
          {recentTransactions.length > 0 ? (
            <div className="transactions-list">
              {recentTransactions.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon" style={{ backgroundColor: transaction.color + '20' }}>
                    <span style={{ color: transaction.color }}>{transaction.icon}</span>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-name">{transaction.description || transaction.category_name}</div>
                    <div className="transaction-meta">
                      {transaction.category_name} • {transaction.user_name} • {new Date(transaction.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount), currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No recent transactions</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Active Goals</h2>
          {goals.length > 0 ? (
            <div className="goals-list">
              {goals.map(goal => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id} className="goal-item">
                    <div className="goal-header">
                      <h3>{goal.name}</h3>
                      <span className="goal-amount">
                        {formatCurrency(parseFloat(goal.current_amount), currency)} / {formatCurrency(parseFloat(goal.target_amount), currency)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    {goal.target_date && (
                      <p className="goal-date">
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-message">No active goals</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

