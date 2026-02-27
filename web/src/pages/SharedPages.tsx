import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Bell, Trash2, CheckCircle, User, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

type PageType = 'notifications' | 'profile';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  event?: {
    id: string;
    title: string;
  };
}

const SharedPages = () => {
  const { page } = useParams<{ page?: string }>();
  const { user, updateUser } = useApp();
  const [activePage, setActivePage] = useState<PageType>('notifications');
  const [loading, setLoading] = useState(true);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Profile state
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setActivePage((page as PageType) || 'notifications');
  }, [page]);

  useEffect(() => {
    if (activePage === 'notifications') {
      fetchNotifications();
    }
  }, [activePage]);

  // ========================================
  // NOTIFICATIONS FUNCTIONS
  // ========================================
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data.notifications);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [name, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value);
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
      }
    }

    return 'Just now';
  };

  // ========================================
  // PROFILE FUNCTIONS
  // ========================================
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const response = await api.put('/auth/profile', profileData);
      updateUser(response.data.data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ========================================
  // RENDER NOTIFICATIONS
  // ========================================
  const renderNotifications = () => {
    if (loading) {
      return (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      );
    }

    return (
      <div className="notifications-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Notifications</h1>
            <p className="dashboard-subtitle">Stay updated with your events</p>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button onClick={markAllAsRead} className="btn btn-secondary">
              <CheckCircle size={18} />
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              >
                <div className="notification-icon">
                  <Bell size={20} />
                </div>
                <div className="notification-content">
                  <h3 className="notification-title">{notification.title}</h3>
                  <p className="notification-message">{notification.message}</p>
                  <p className="notification-time">{getTimeAgo(notification.createdAt)}</p>
                </div>
                <div className="notification-actions">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="icon-btn"
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="icon-btn"
                    title="Delete"
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ========================================
  // RENDER PROFILE
  // ========================================
  const renderProfile = () => {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Profile Settings</h1>
            <p className="dashboard-subtitle">Manage your account information</p>
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gap: '2rem' }}>
          {/* PROFILE INFORMATION */}
          <div className="card">
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <User size={20} />
              Profile Information
            </h2>

            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="label">
                  <Mail size={16} />
                  Email
                </label>
                <input type="email" value={user?.email} className="input" disabled />
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                  }}
                >
                  Email cannot be changed
                </p>
              </div>

              <div className="form-group">
                <label className="label">Username</label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  className="input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Role</label>
                <input
                  type="text"
                  value={user?.role === 'CREATOR' ? 'Creator' : 'Eventee'}
                  className="input"
                  disabled
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* CHANGE PASSWORD */}
          <div className="card">
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Lock size={20} />
              Change Password
            </h2>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="label">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input"
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <>
      {activePage === 'notifications' && renderNotifications()}
      {activePage === 'profile' && renderProfile()}
    </>
  );
};

export default SharedPages;