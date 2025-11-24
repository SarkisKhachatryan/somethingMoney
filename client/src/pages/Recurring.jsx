import { useState, useEffect } from 'react';
import axios from 'axios';
import './Recurring.css';

function Recurring() {
  const [familyId, setFamilyId] = useState(null);
  const [families, setFamilies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    type: 'expense',
    amount: '',
    description: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dayOfMonth: new Date().getDate(),
    dayOfWeek: new Date().getDay()
  });

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchCategories();
      fetchRecurring();
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

  const fetchRecurring = async () => {
    try {
      const response = await axios.get(`/api/recurring/family/${familyId}`);
      setRecurring(response.data.recurring);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        familyId,
        ...formData,
        amount: parseFloat(formData.amount),
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : null,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : null
      };

      if (editingRecurring) {
        await axios.put(`/api/recurring/${editingRecurring.id}`, payload);
      } else {
        await axios.post('/api/recurring', payload);
      }

      setShowModal(false);
      setEditingRecurring(null);
      setFormData({
        categoryId: '',
        type: 'expense',
        amount: '',
        description: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        dayOfMonth: new Date().getDate(),
        dayOfWeek: new Date().getDay()
      });
      fetchRecurring();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save recurring transaction');
    }
  };

  const handleEdit = (item) => {
    setEditingRecurring(item);
    setFormData({
      categoryId: item.category_id,
      type: item.type,
      amount: item.amount,
      description: item.description || '',
      frequency: item.frequency,
      startDate: item.start_date,
      endDate: item.end_date || '',
      dayOfMonth: item.day_of_month || new Date().getDate(),
      dayOfWeek: item.day_of_week || new Date().getDay()
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return;
    try {
      await axios.delete(`/api/recurring/${id}`);
      fetchRecurring();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete recurring transaction');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await axios.put(`/api/recurring/${id}`, { isActive: !currentStatus });
      fetchRecurring();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleProcess = async () => {
    if (!confirm('This will create transactions for all due recurring items. Continue?')) return;
    try {
      const response = await axios.post('/api/recurring/process', { familyId });
      alert(`Created ${response.data.createdCount} transactions!`);
      fetchRecurring();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to process recurring transactions');
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  const getFrequencyLabel = (frequency) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[frequency] || frequency;
  };

  const getDayOfWeekLabel = (day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || '';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="recurring-page">
      <div className="page-header">
        <h1>Recurring Transactions</h1>
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
          <button onClick={handleProcess} className="secondary-btn">
            Process Due
          </button>
          <button onClick={() => setShowModal(true)} className="primary-btn">
            + Add Recurring
          </button>
        </div>
      </div>

      <div className="recurring-list">
        {recurring.length === 0 ? (
          <div className="empty-state">
            <p>No recurring transactions yet. Add your first recurring transaction!</p>
          </div>
        ) : (
          recurring.map(item => (
            <div key={item.id} className={`recurring-card ${!item.is_active ? 'inactive' : ''}`}>
              <div className="recurring-icon" style={{ backgroundColor: item.color + '20' }}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </div>
              <div className="recurring-details">
                <div className="recurring-header">
                  <h3>{item.description || item.category_name}</h3>
                  <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="recurring-info">
                  <span className="category-name">{item.category_name}</span>
                  <span className="separator">•</span>
                  <span className="frequency">{getFrequencyLabel(item.frequency)}</span>
                  <span className="separator">•</span>
                  <span className="user-name">{item.user_name}</span>
                </div>
                <div className="recurring-schedule">
                  <div className="schedule-item">
                    <strong>Amount:</strong> 
                    <span className={`amount ${item.type}`}>
                      {item.type === 'expense' ? '-' : '+'}${parseFloat(item.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="schedule-item">
                    <strong>Next:</strong> {new Date(item.next_occurrence).toLocaleDateString()}
                  </div>
                  {item.frequency === 'monthly' && item.day_of_month && (
                    <div className="schedule-item">
                      <strong>Day:</strong> {item.day_of_month}
                    </div>
                  )}
                  {item.frequency === 'weekly' && item.day_of_week !== null && (
                    <div className="schedule-item">
                      <strong>Day:</strong> {getDayOfWeekLabel(item.day_of_week)}
                    </div>
                  )}
                </div>
              </div>
              <div className="recurring-actions">
                <button
                  onClick={() => handleToggleActive(item.id, item.is_active)}
                  className={`toggle-btn ${item.is_active ? 'deactivate' : 'activate'}`}
                >
                  {item.is_active ? '⏸️' : '▶️'}
                </button>
                <button onClick={() => handleEdit(item)} className="icon-btn">✏️</button>
                <button onClick={() => handleDelete(item.id)} className="icon-btn">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setEditingRecurring(null);
          setFormData({
            categoryId: '',
            type: 'expense',
            amount: '',
            description: '',
            frequency: 'monthly',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            dayOfMonth: new Date().getDate(),
            dayOfWeek: new Date().getDay()
          });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRecurring ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}</h2>
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
                <label>Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              {formData.frequency === 'weekly' && (
                <div className="form-group">
                  <label>Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}
              {formData.frequency === 'monthly' && (
                <div className="form-group">
                  <label>Day of Month (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setEditingRecurring(null);
                  setFormData({
                    categoryId: '',
                    type: 'expense',
                    amount: '',
                    description: '',
                    frequency: 'monthly',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                    dayOfMonth: new Date().getDate(),
                    dayOfWeek: new Date().getDay()
                  });
                }} className="secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingRecurring ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recurring;

