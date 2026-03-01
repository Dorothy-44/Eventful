import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Calendar,
  Ticket,
  DollarSign,
  Users,
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
  TrendingUp,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

type ViewType = 'dashboard' | 'events' | 'create' | 'edit' | 'attendees' | 'scan' | 'analytics';

interface CreatorDashboardProps {
  view?: ViewType;
}

const CreatorDashboard = ({ view: viewProp }: CreatorDashboardProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewType>(viewProp || 'dashboard');
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

  useEffect(() => {
    const currentView = viewProp || 'dashboard';
    setActiveView(currentView);

    if (currentView === 'edit' && id) {
      fetchEventForEdit(id);
    }
  }, [viewProp, id]);

  useEffect(() => {
    loadData();
  }, [activeView, attendeeFilter]);

  useEffect(() => {
    if (activeView === 'scan' && scanning) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        async (decodedText) => {
          try {
            const response = await api.post('/tickets/scan', { qrData: decodedText });
            setScanResult(response.data.data);
            setScanning(false);
            scanner.clear();
            toast.success('Ticket scanned successfully!');
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid ticket');
          }
        },
        () => {}
      );
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [activeView, scanning]);

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
      toast.error('Could not load event for editing');
    }
  };

  const fetchAttendees = async (eventId: string) => {
    try {
      const response = await api.get(
        `/events/${eventId}/attendees?filter=${attendeeFilter}`
      );
      setAttendees(response.data.data.attendees || []);
      setAttendeeStats(response.data.data.stats || null);
    } catch (e) {
      toast.error('Could not load attendees');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics');
      setAnalytics(response.data.data || null);
    } catch (e) {
      toast.error('Could not load analytics');
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/events', {
        ...formData,
        ticketPrice: parseFloat(formData.ticketPrice),
        totalTickets: parseInt(formData.totalTickets),
      });
      toast.success('Event created successfully!');
      setFormData({
        title: '',
        description: '',
        location: '',
        eventDate: '',
        ticketPrice: '',
        totalTickets: '',
        imageUrl: '',
        isActive: true,
      });
      navigate('/creator/events');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setFormLoading(true);
    try {
      await api.put(`/events/${id}`, {
        ...formData,
        ticketPrice: parseFloat(formData.ticketPrice),
        totalTickets: parseInt(formData.totalTickets),
      });
      toast.success('Event updated successfully!');
      navigate('/creator/events');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${eventId}`);
      toast.success('Event deleted');
      fetchMyEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    }
  };

  const renderDashboard = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Events</p>
            <h3 className="stat-value">{stats?.totalEvents ?? 0}</h3>
            <p className="stat-change">{stats?.activeEvents ?? 0} active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <Ticket size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Tickets Sold</p>
            <h3 className="stat-value">{stats?.ticketsSold ?? 0}</h3>
            <p className="stat-change">All time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Attendees</p>
            <h3 className="stat-value">{stats?.totalAttendees ?? 0}</h3>
            <p className="stat-change">Scanned</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h3 className="stat-value">
              ₦{(stats?.totalRevenue ?? 0).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '2rem' }}>
        <div
          className="section-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 className="section-title">Recent Events</h2>
          <button onClick={() => navigate('/creator/events')} className="btn-text">
            View all
          </button>
        </div>
        {recentEvents.length === 0 ? (
          <div
            className="empty-state"
            style={{
              padding: '3rem',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}
          >
            <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No events yet</p>
            <button
              onClick={() => navigate('/creator/create')}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="events-list">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="event-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div>
                  <h3 className="event-title" style={{ fontWeight: '600' }}>
                    {event.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    {new Date(event.eventDate).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '600' }}>
                    {event.totalTickets - event.availableTickets} sold
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                    ₦{event.ticketPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderMyEvents = () => (
    <div className="events-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {events.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
          }}
        >
          <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <p>You have no events yet.</p>
          <button
            onClick={() => navigate('/creator/create')}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="event-card"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{event.title}</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', opacity: 0.7, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} />
                  {new Date(event.eventDate).toLocaleDateString()}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={14} />
                  {event.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Ticket size={14} />
                  {event.totalTickets - event.availableTickets}/{event.totalTickets} sold
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '20px',
                  background: event.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: event.isActive ? '#22c55e' : '#ef4444',
                }}
              >
                {event.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => navigate(`/creator/attendees/${event.id}`)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                <Users size={14} />
              </button>
              <button
                onClick={() => navigate(`/creator/edit/${event.id}`)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => handleDeleteEvent(event.id)}
                className="btn btn-danger"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderEventForm = (isEdit: boolean) => (
    <form
      onSubmit={isEdit ? handleUpdateEvent : handleCreateEvent}
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '640px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {isEdit && (
        <button
          type="button"
          onClick={() => navigate('/creator/events')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            opacity: 0.7,
            marginBottom: '0.5rem',
            padding: 0,
          }}
        >
          <ArrowLeft size={18} /> Back to Events
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Event Title *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleFormChange}
          required
          placeholder="e.g. Lagos Music Festival"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleFormChange}
          required
          rows={4}
          placeholder="Describe your event..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={15} /> Location *
          </span>
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleFormChange}
          required
          placeholder="e.g. Eko Hotel, Lagos"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={15} /> Event Date & Time *
          </span>
        </label>
        <input
          type="datetime-local"
          name="eventDate"
          value={formData.eventDate}
          onChange={handleFormChange}
          required
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={15} /> Ticket Price (₦) *
            </span>
          </label>
          <input
            type="number"
            name="ticketPrice"
            value={formData.ticketPrice}
            onChange={handleFormChange}
            required
            min="0"
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Ticket size={15} /> Total Tickets *
            </span>
          </label>
          <input
            type="number"
            name="totalTickets"
            value={formData.totalTickets}
            onChange={handleFormChange}
            required
            min="1"
            placeholder="100"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Image size={15} /> Image URL (optional)
          </span>
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleFormChange}
          placeholder="https://example.com/image.jpg"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="checkbox"
          name="isActive"
          id="isActive"
          checked={formData.isActive}
          onChange={handleFormChange}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="isActive" style={{ fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}>
          Publish event immediately
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => navigate('/creator/events')}
          className="btn btn-secondary"
          style={{ flex: 1 }}
          disabled={formLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: 2 }}
          disabled={formLoading}
        >
          {formLoading
            ? isEdit
              ? 'Saving...'
              : 'Creating...'
            : isEdit
            ? 'Save Changes'
            : 'Create Event'}
        </button>
      </div>
    </form>
  );

  const renderAttendees = () => (
    <div>
      <button
        onClick={() => navigate('/creator/events')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          opacity: 0.7,
          marginBottom: '1.5rem',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Back to Events
      </button>

      {attendeeStats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue"><Users size={20} /></div>
            <div className="stat-content">
              <p className="stat-label">Total Registered</p>
              <h3 className="stat-value">{attendeeStats.total ?? 0}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green"><CheckCircle size={20} /></div>
            <div className="stat-content">
              <p className="stat-label">Checked In</p>
              <h3 className="stat-value">{attendeeStats.checkedIn ?? 0}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange"><XCircle size={20} /></div>
            <div className="stat-content">
              <p className="stat-label">Not Checked In</p>
              <h3 className="stat-value">{attendeeStats.notCheckedIn ?? 0}</h3>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['all', 'checked-in', 'not-checked-in'].map((f) => (
          <button
            key={f}
            onClick={() => setAttendeeFilter(f)}
            className={attendeeFilter === f ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem', textTransform: 'capitalize' }}
          >
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      {attendees.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
          No attendees found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {attendees.map((attendee) => (
            <div
              key={attendee.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} />
                </div>
                <div>
                  <p style={{ fontWeight: '500' }}>{attendee.user?.username || attendee.user?.email}</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{attendee.user?.email}</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '20px',
                  background: attendee.isScanned ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: attendee.isScanned ? '#22c55e' : '#ef4444',
                }}
              >
                {attendee.isScanned ? 'Checked In' : 'Not Checked In'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderQRScanner = () => (
    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      {scanning ? (
        <>
          <p style={{ marginBottom: '1rem', opacity: 0.7 }}>
            Point the camera at a ticket QR code to scan it.
          </p>
          <div id="qr-reader" style={{ borderRadius: '12px', overflow: 'hidden' }} />
        </>
      ) : scanResult ? (
        <div
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid #22c55e',
            borderRadius: '12px',
            padding: '2rem',
          }}
        >
          <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Ticket Valid!</h3>
          <p style={{ opacity: 0.8 }}>{scanResult.user?.username || scanResult.user?.email}</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.25rem' }}>
            {scanResult.event?.title}
          </p>
          <button
            onClick={() => {
              setScanResult(null);
              setScanning(true);
            }}
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
          >
            Scan Another
          </button>
        </div>
      ) : null}
    </div>
  );

  const renderAnalytics = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {!analytics ? (
        <div style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>
          No analytics data available.
        </div>
      ) : (
        <>
          {analytics.ticketSalesOverTime?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} /> Ticket Sales Over Time
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.ticketSalesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tickets" stroke="var(--accent-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {analytics.revenueByEvent?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} /> Revenue by Event
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.revenueByEvent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (loading && !stats && activeView !== 'scan') {
    return (
      <div
        className="loading-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem' }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper" style={{ padding: '1rem' }}>
      <div
        className="dashboard-header"
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            className="dashboard-title"
            style={{ fontSize: '1.8rem', fontWeight: 'bold' }}
          >
            {activeView === 'dashboard' && 'Creator Dashboard'}
            {activeView === 'events' && 'My Events'}
            {activeView === 'analytics' && 'Analytics'}
            {activeView === 'create' && 'New Event'}
            {activeView === 'edit' && 'Edit Event'}
            {activeView === 'attendees' && 'Attendees'}
            {activeView === 'scan' && 'Scan QR Code'}
          </h1>
          <p style={{ opacity: 0.7 }}>Manage your groove and track performance</p>
        </div>

        {(activeView === 'dashboard' || activeView === 'events') && (
          <button
            onClick={() => navigate('/creator/create')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
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

const inputStyle: React.CSSProperties = {
  padding: '0.65rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
  width: '100%',
  boxSizing: 'border-box',
};

export default CreatorDashboard;