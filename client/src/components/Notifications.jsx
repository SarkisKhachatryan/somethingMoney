import { useState, useEffect } from 'react';
import axios from 'axios';
import './Notifications.css';

function Notifications({ familyId, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (familyId) {
      fetchNotifications();
    }
  }, [familyId]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`/api/notifications/family/${familyId}`);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, currentRead) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, { read: !currentRead });
      fetchNotifications();
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`/api/notifications/family/${familyId}/read-all`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'bill_reminder':
        return '📅';
      case 'budget_alert':
        return '⚠️';
      case 'goal_milestone':
        return '🎯';
      default:
        return '🔔';
    }
  };

  if (loading) {
    return <div className="notifications-panel">Loading...</div>;
  }

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <h2>Notifications</h2>
        <div className="notifications-actions">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="mark-all-read-btn">
              Mark all as read
            </button>
          )}
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
      </div>
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
              <div className="notification-actions">
                <button
                  onClick={() => handleMarkAsRead(notification.id, notification.read)}
                  className="action-btn"
                  title={notification.read ? 'Mark as unread' : 'Mark as read'}
                >
                  {notification.read ? '📬' : '📭'}
                </button>
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="action-btn delete-btn"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;

