import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/currency';
import { useCurrency } from '../hooks/useCurrency';
import './Transactions.css';

function Transactions() {
  const [familyId, setFamilyId] = useState(null);
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    type: 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const currency = useCurrency(familyId);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchCategories();
      fetchTransactions();
    }
  }, [familyId]);

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

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`/api/transactions/family/${familyId}`);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await axios.put(`/api/transactions/${editingTransaction.id}`, {
          ...formData,
          amount: parseFloat(formData.amount)
        });
      } else {
        await axios.post('/api/transactions', {
          familyId,
          ...formData,
          amount: parseFloat(formData.amount)
        });
      }
      setShowModal(false);
      setEditingTransaction(null);
      setFormData({
        categoryId: '',
        type: 'expense',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save transaction');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      categoryId: transaction.category_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await axios.delete(`/api/transactions/${id}`);
      fetchTransactions();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete transaction');
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h1>Transactions</h1>
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
          <div className="export-buttons">
            <button
              onClick={() => {
                const url = `/api/export/transactions/csv?familyId=${familyId}`;
                window.open(url, '_blank');
              }}
              className="export-btn"
              title="Export to CSV"
            >
              📥 CSV
            </button>
            <button
              onClick={() => {
                const url = `/api/export/transactions/pdf?familyId=${familyId}`;
                window.open(url, '_blank');
              }}
              className="export-btn"
              title="Export to PDF"
            >
              📄 PDF
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="primary-btn">
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet. Add your first transaction!</p>
          </div>
        ) : (
          transactions.map(transaction => (
            <div key={transaction.id} className="transaction-card">
              <div className="transaction-icon" style={{ backgroundColor: transaction.color + '20' }}>
                <span style={{ color: transaction.color }}>{transaction.icon}</span>
              </div>
              <div className="transaction-details">
                <div className="transaction-name">
                  {transaction.description || transaction.category_name}
                </div>
                <div className="transaction-meta">
                  {transaction.category_name} • {transaction.user_name} • {new Date(transaction.date).toLocaleDateString()}
                </div>
              </div>
              <div className="transaction-actions">
                <div className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount), currency)}
                </div>
                <div className="action-buttons">
                  <button onClick={() => handleEdit(transaction)} className="icon-btn">✏️</button>
                  <button onClick={() => handleDelete(transaction.id)} className="icon-btn">🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setEditingTransaction(null);
          setFormData({
            categoryId: '',
            type: 'expense',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
          });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value, categoryId: '' });
                  }}
                  required
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {filteredCategories.map(cat => (
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
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setEditingTransaction(null);
                  setFormData({
                    categoryId: '',
                    type: 'expense',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                  });
                }} className="secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingTransaction ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;

