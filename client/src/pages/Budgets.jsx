import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/currency';
import { useCurrency } from '../hooks/useCurrency';
import './Budgets.css';

function Budgets() {
  const [familyId, setFamilyId] = useState(null);
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({ categoryId: '', amount: '' });
  const currency = useCurrency(familyId);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchCategories();
      fetchBudgets();
    }
  }, [familyId, month, year]);

  const fetchFamilies = async () => {
    try {
      const response = await axios.get('/api/family');
      setFamilies(response.data.families);
      if (response.data.families.length > 0 && !familyId) {
        setFamilyId(response.data.families[0].id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`/api/categories/family/${familyId}`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await axios.get(`/api/budget/family/${familyId}`, {
        params: { month, year }
      });
      setBudgets(response.data.budgets);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/budget', {
        familyId,
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount),
        month,
        year
      });
      setShowModal(false);
      setFormData({ categoryId: '', amount: '' });
      setEditingBudget(null);
      fetchBudgets();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save budget');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({ categoryId: budget.category_id, amount: budget.amount });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await axios.delete(`/api/budget/${id}`);
      fetchBudgets();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete budget');
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const budgetMap = budgets.reduce((acc, b) => {
    acc[b.category_id] = b;
    return acc;
  }, {});

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="budgets-page">
      <div className="page-header">
        <h1>Budgets</h1>
        <div className="header-controls">
          <select
            value={familyId}
            onChange={(e) => setFamilyId(Number(e.target.value))}
            className="family-select"
          >
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
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
          <button onClick={() => setShowModal(true)} className="primary-btn">
            + Add Budget
          </button>
        </div>
      </div>

      <div className="budgets-grid">
        {expenseCategories.map(category => {
          const budget = budgetMap[category.id];
          return (
            <div key={category.id} className="budget-card">
              <div className="budget-header">
                <div className="category-info">
                  <span className="category-icon" style={{ color: category.color }}>
                    {category.icon}
                  </span>
                  <h3>{category.name}</h3>
                </div>
                {budget ? (
                  <div className="budget-actions">
                    <button onClick={() => handleEdit(budget)} className="icon-btn">✏️</button>
                    <button onClick={() => handleDelete(budget.id)} className="icon-btn">🗑️</button>
                  </div>
                ) : null}
              </div>
              {budget ? (
                <div className="budget-amount">
                  {formatCurrency(budget.amount, currency)}
                </div>
              ) : (
                <div className="no-budget">
                  <p>No budget set</p>
                  <button onClick={() => {
                    setFormData({ categoryId: category.id, amount: '' });
                    setShowModal(true);
                  }} className="small-btn">
                    Set Budget
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setEditingBudget(null);
          setFormData({ categoryId: '', amount: '' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBudget ? 'Edit Budget' : 'Add Budget'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                  disabled={!!editingBudget}
                >
                  <option value="">Select category</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setEditingBudget(null);
                  setFormData({ categoryId: '', amount: '' });
                }} className="secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingBudget ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budgets;

