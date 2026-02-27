import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  LayoutDashboard,
  Calendar,
  Ticket,
  QrCode,
  BarChart3,
  Plus,
  CreditCard,
  List,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

// 1. ADD: Props interface to accept children
interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    // 2. UPDATE: Matches your App.tsx public route
    navigate('/auth'); 
  };

  const creatorLinks = [
    { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/creator/events', icon: Calendar, label: 'My Events' },
    { to: '/creator/create', icon: Plus, label: 'Create Event' },
    { to: '/creator/scan', icon: QrCode, label: 'Scan QR' },
    { to: '/creator/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const eventeeLinks = [
    { to: '/eventee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/eventee/events', icon: List, label: 'All Events' },
    { to: '/eventee/tickets', icon: Ticket, label: 'My Tickets' },
    { to: '/eventee/payments', icon: CreditCard, label: 'Payments' },
  ];

  const links = user?.role === 'CREATOR' ? creatorLinks : eventeeLinks;

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="navbar-logo">🎵</span>
            <span className="navbar-title">Groove</span>
          </Link>

          <div className="navbar-right">
            <span className="navbar-welcome">
              Welcome, <strong>{user?.username}</strong>
            </span>
            <Link to="/notifications" className="navbar-icon-btn">
              <Bell size={20} />
              {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
            </Link>
            <button onClick={toggleTheme} className="navbar-icon-btn">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <Link to="/profile" className="navbar-icon-btn">
              <User size={20} />
            </Link>
            <button onClick={handleLogout} className="navbar-icon-btn">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <div className="layout-container">
        <aside className="sidebar">
          <div className="sidebar-content">
            <nav className="sidebar-nav">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                  }
                >
                  <link.icon size={20} />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="layout-main">
          {/* 3. UPDATE: This ensures nested Routes from App.tsx actually render */}
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;