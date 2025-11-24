import { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

function Settings() {
  const [familyId, setFamilyId] = useState(null);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: '💰'
  });
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchFamilyDetails();
      fetchCategories();
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

  const fetchFamilyDetails = async () => {
    try {
      const response = await axios.get(`/api/family/${familyId}`);
      setSelectedFamily(response.data);
    } catch (error) {
      console.error('Error fetching family details:', error);
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

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/categories', {
        familyId,
        ...categoryForm
      });
      setShowCategoryModal(false);
      setCategoryForm({ name: '', type: 'expense', color: '#3B82F6', icon: '💰' });
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`/api/categories/${id}`);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/family/${familyId}/members`, {
        email: memberEmail
      });
      setShowMemberModal(false);
      setMemberEmail('');
      fetchFamilyDetails();
      alert('Member added successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add member');
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
      <div className="settings-page">
        <div className="empty-state">
          <h2>No families yet</h2>
          <p>Create your first family to get started</p>
          <button onClick={createFamily} className="primary-btn">
            Create Family
          </button>
        </div>
      </div>
    );
  }

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const iconOptions = ['💰', '🍔', '🚗', '🏠', '💡', '👕', '🎮', '✈️', '📚', '🏥', '💊', '🎬', '🍕', '☕', '🛒'];

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <select
          value={familyId}
          onChange={(e) => setFamilyId(Number(e.target.value))}
          className="family-select"
        >
          {families.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <div className="section-header">
            <h2>Family Members</h2>
            <button onClick={() => setShowMemberModal(true)} className="primary-btn">
              + Add Member
            </button>
          </div>
          {selectedFamily && (
            <div className="members-list">
              {selectedFamily.members.map(member => (
                <div key={member.id} className="member-item">
                  <div>
                    <div className="member-name">{member.name}</div>
                    <div className="member-email">{member.email}</div>
                  </div>
                  <span className={`member-role ${member.role}`}>{member.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="settings-section">
          <div className="section-header">
            <h2>Expense Categories</h2>
            <button onClick={() => {
              setCategoryForm({ name: '', type: 'expense', color: '#3B82F6', icon: '💰' });
              setShowCategoryModal(true);
            }} className="primary-btn">
              + Add Category
            </button>
          </div>
          <div className="categories-grid">
            {expenseCategories.map(category => (
              <div key={category.id} className="category-item">
                <span className="category-icon" style={{ color: category.color }}>
                  {category.icon}
                </span>
                <span className="category-name">{category.name}</span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="delete-btn"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="section-header">
            <h2>Income Categories</h2>
            <button onClick={() => {
              setCategoryForm({ name: '', type: 'income', color: '#10b981', icon: '💰' });
              setShowCategoryModal(true);
            }} className="primary-btn">
              + Add Category
            </button>
          </div>
          <div className="categories-grid">
            {incomeCategories.map(category => (
              <div key={category.id} className="category-item">
                <span className="category-icon" style={{ color: category.color }}>
                  {category.icon}
                </span>
                <span className="category-name">{category.name}</span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="delete-btn"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCategoryModal(false);
          setCategoryForm({ name: '', type: 'expense', color: '#3B82F6', icon: '💰' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Category</h2>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Icon</label>
                <div className="icon-selector">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${categoryForm.icon === icon ? 'selected' : ''}`}
                      onClick={() => setCategoryForm({ ...categoryForm, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryForm({ name: '', type: 'expense', color: '#3B82F6', icon: '💰' });
                }} className="secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-overlay" onClick={() => {
          setShowMemberModal(false);
          setMemberEmail('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Family Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  placeholder="member@example.com"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowMemberModal(false);
                  setMemberEmail('');
                }} className="secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;

