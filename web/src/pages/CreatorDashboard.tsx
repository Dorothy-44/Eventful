import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Calendar,
  Ticket,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  MapPin,
  Image,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

type ViewType = 'dashboard' | 'events' | 'create' | 'edit' | 'attendees' | 'scan' | 'analytics';

const CreatorDashboard = () => {
  const { view, id } = useParams<{ view?: string; id?: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    eventDate: '',
    ticketPrice: '',
    totalTickets: '',
    imageUrl: '',
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeeStats, setAttendeeStats] = useState<any>(null);
  const [attendeeFilter, setAttendeeFilter] = useState('all');
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Determine active view from URL
  useEffect(() => {
    const currentView = (view as ViewType) || 'dashboard';
    setActiveView(currentView);
    
    if (currentView === 'edit' && id) {
      fetchEventForEdit(id);
    }
  }, [view, id]);

  // Load data based on active view
  useEffect(() => {
    loadData();
  }, [activeView, attendeeFilter]);

  const loadData = async () => {
    if (!stats) setLoading(true);
    try {
      switch (activeView) {
        case 'dashboard':
          await fetchDashboardData();
          break;
        case 'events':
          await fetchMyEvents();
          break;
        case 'attendees':
          if (id) await fetchAttendees(id);
          break;
        case 'analytics':
          await fetchAnalytics();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, eventsRes] = await Promise.all([
        api.get('/analytics'),
        api.get('/events/my/events?limit=5'),
      ]);
      setStats(analyticsRes.data.data.summary || {});
      setRecentEvents(eventsRes.data.data.events || []);
    } catch (e) {
      setStats({});
    }
  };

  const fetchMyEvents = async () => {
    const response = await api.get('/events/my/events');
    setEvents(response.data.data.events || []);
  };

  const fetchEventForEdit = async (eventId: string) => {
    try {
      const response = await api.get(`/events/${eventId}`);
      const event = response.data.data;
      setFormData({
        title: event.title,
        description: event.description,
        location: event.location,
        eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        imageUrl: event.imageUrl || '',
        isActive: event.isActive,
      });
    } catch (e) {
      toast.error("Could not load event for editing");
    }
  };

  // Helper render functions
  const renderDashboard = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Calendar size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Events</p>
            <h3 className="stat-value">{stats?.totalEvents ?? 0}</h3>
            <p className="stat-change">{stats?.activeEvents ?? 0} active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Ticket size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Tickets Sold</p>
            <h3 className="stat-value">{stats?.ticketsSold ?? 0}</h3>
            <p className="stat-change">All time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><Users size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Attendees</p>
            <h3 className="stat-value">{stats?.totalAttendees ?? 0}</h3>
            <p className="stat-change">Scanned</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange"><DollarSign size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h3 className="stat-value">₦{(stats?.totalRevenue ?? 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '2rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title">Recent Events</h2>
          <button onClick={() => navigate('/creator/events')} className="btn-text">View all</button>
        </div>
        {recentEvents.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No events yet</p>
            <button onClick={() => navigate('/creator/create')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="events-list">
            {recentEvents.map((event) => (
              <div key={event.id} className="event-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <h3 className="event-title" style={{ fontWeight: '600' }}>{event.title}</h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{new Date(event.eventDate).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '600' }}>{event.totalTickets - event.availableTickets} sold</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>₦{event.ticketPrice.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Missing functions placeholder (replace with your original logic for these)
  const renderMyEvents = () => <div>My Events Content</div>;
  const renderEventForm = (isEdit: boolean) => <div>Event Form Content</div>;
  const renderAttendees = () => <div>Attendees Content</div>;
  const renderQRScanner = () => <div>QR Scanner Content</div>;
  const renderAnalytics = () => <div>Analytics Content</div>;
  const fetchAttendees = async (id: string) => {};
  const fetchAnalytics = async () => {};

  if (loading && !stats && activeView !== 'scan') {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem' }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper" style={{ padding: '1rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
            {activeView === 'dashboard' && 'Creator Dashboard'}
            {activeView === 'events' && 'My Events'}
            {activeView === 'analytics' && 'Analytics'}
            {activeView === 'create' && 'New Event'}
            {activeView === 'edit' && 'Edit Event'}
          </h1>
          <p style={{ opacity: 0.7 }}>Manage your groove and track performance</p>
        </div>
        
        {(activeView === 'dashboard' || activeView === 'events') && (
          <button onClick={() => navigate('/creator/create')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> Create Event
          </button>
        )}
      </div>

      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'events' && renderMyEvents()}
      {(activeView === 'create' || activeView === 'edit') && renderEventForm(activeView === 'edit')}
      {activeView === 'attendees' && renderAttendees()}
      {activeView === 'scan' && renderQRScanner()}
      {activeView === 'analytics' && renderAnalytics()}
    </div>
  );
};

export default CreatorDashboard;