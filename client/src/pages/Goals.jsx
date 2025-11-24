import { useState, useEffect } from 'react';
import axios from 'axios';
import './Goals.css';

function Goals() {
  const [familyId, setFamilyId] = useState(null);
  const [families, setFamilies] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    description: ''
  });

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchGoals();
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

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`/api/goals/family/${familyId}`);
      setGoals(response.data.goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        await axios.put(`/api/goals/${editingGoal.id}`, {
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount)
        });
      } else {
        await axios.post('/api/goals', {
          familyId,
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount)
        });
      }
      setShowModal(false);
      setEditingGoal(null);
      setFormData({
        name: '',
        targetAmount: '',
        currentAmount: '0',
        targetDate: '',
        description: ''
      });
      fetchGoals();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save goal');
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      targetDate: goal.target_date || '',
      description: goal.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await axios.delete(`/api/goals/${id}`);
      fetchGoals();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete goal');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="goals-page">
      <div className="page-header">
        <h1>Goals</h1>
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
          <button onClick={() => setShowModal(true)} className="primary-btn">
            + Add Goal
          </button>
        </div>
      </div>

      <div className="goals-grid">
        {goals.length === 0 ? (
          <div className="empty-state">
            <p>No goals yet. Create your first financial goal!</p>
          </div>
        ) : (
          goals.map(goal => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            const isComplete = goal.current_amount >= goal.target_amount;
            return (
              <div key={goal.id} className={`goal-card ${isComplete ? 'complete' : ''}`}>
                <div className="goal-header">
                  <h2>{goal.name}</h2>
                  <div className="goal-actions">
                    <button onClick={() => handleEdit(goal)} className="icon-btn">✏️</button>
                    <button onClick={() => handleDelete(goal.id)} className="icon-btn">🗑️</button>
                  </div>
                </div>
                {goal.description && (
                  <p className="goal-description">{goal.description}</p>
                )}
                <div className="goal-progress">
                  <div className="progress-info">
                    <span className="current-amount">${parseFloat(goal.current_amount).toFixed(2)}</span>
                    <span className="target-amount">of ${parseFloat(goal.target_amount).toFixed(2)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="progress-percentage">
                    {progress.toFixed(1)}% Complete
                  </div>
                </div>
                {goal.target_date && (
                  <div className="goal-date">
                    Target Date: {new Date(goal.target_date).toLocaleDateString()}
                  </div>
                )}
                {goal.user_name && (
                  <div className="goal-owner">
                    Owner: {goal.user_name}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setEditingGoal(null);
          setFormData({
            name: '',
            targetAmount: '',
            currentAmount: '0',
            targetDate: '',
            description: ''
          });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Vacation Fund"
                />
              </div>
              <div className="form-group">
                <label>Target Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Current Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Target Date (Optional)</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Add a description for this goal"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setEditingGoal(null);
                  setFormData({
                    name: '',
                    targetAmount: '',
                    currentAmount: '0',
                    targetDate: '',
                    description: ''
                  });
                }} className="secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingGoal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Goals;

