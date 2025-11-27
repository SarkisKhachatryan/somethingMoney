import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import Notifications from './Notifications';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [familyId, setFamilyId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (familyId) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [familyId]);

  const fetchFamilies = async () => {
    try {
      const response = await axios.get('/api/family');
      if (response.data.families.length > 0) {
        setFamilyId(response.data.families[0].id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const fetchUnreadCount = async () => {
    if (!familyId) return;
    try {
      const response = await axios.get(`/api/notifications/family/${familyId}`, {
        params: { unreadOnly: 'true' }
      });
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/budgets', label: 'Budgets', icon: '💰' },
    { path: '/transactions', label: 'Transactions', icon: '💳' },
    { path: '/recurring', label: 'Recurring', icon: '🔄' },
    { path: '/goals', label: 'Goals', icon: '🎯' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>💰 Budget Tracker</h1>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <button
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="theme-toggle-container">
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="main-content">
        <div className="main-header">
          <button
            className="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
        </div>
        <Outlet />
      </main>
      {showNotifications && (
        <>
          <div className="notifications-overlay" onClick={() => setShowNotifications(false)} />
          <Notifications
            familyId={familyId}
            onClose={() => setShowNotifications(false)}
          />
        </>
      )}
    </div>
  );
}

export default Layout;

