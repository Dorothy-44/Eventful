import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Calendar,
  Ticket,
  Clock,
  TrendingUp,
  Search,
  MapPin,
  User,
  ArrowLeft,
  Download,
  Share2,
  PlusCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

type TabType = 'dashboard' | 'events' | 'tickets' | 'payments';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  ticketPrice: number;
  availableTickets: number;
  totalTickets: number;
  imageUrl?: string;
  creator: {
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  qrCode: string;
  status: string;
  purchaseDate: string;
  scannedAt?: string;
  event: {
    id: string;
    title: string;
    description: string;
    eventDate: string;
    location: string;
    ticketPrice: number;
    imageUrl?: string;
  };
  payment?: {
    amount: number;
    status: string;
    reference: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  reference: string;
  status: string;
  createdAt: string;
  ticket: {
    ticketNumber: string;
    event: {
      title: string;
      eventDate: string;
    };
  };
}

const EventeeDashboard = () => {
  const { view, id } = useParams<{ view?: string; id?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);

  const [upcomingEvents, setUpcomingEvents] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState({
    totalTickets: 0,
    upcomingEvents: 0,
    attendedEvents: 0,
  });

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (view === 'events') {
      setActiveTab('events');
      if (id) fetchEventDetails(id);
    } else if (view === 'tickets') {
      setActiveTab('tickets');
      if (id) fetchTicketDetails(id);
    } else if (view === 'payments') {
      setActiveTab('payments');
    } else {
      setActiveTab('dashboard');
    }
  }, [view, id]);

  useEffect(() => {
    loadData();
  }, [activeTab, search, ticketFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard':
          await fetchDashboardData();
          break;
        case 'events':
          if (!selectedEvent) await fetchAllEvents();
          break;
        case 'tickets':
          if (!selectedTicket) await fetchTickets();
          break;
        case 'payments':
          await fetchPayments();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [upcomingRes, ticketsRes, eventsRes] = await Promise.all([
        api.get('/tickets/my-upcoming'),
        api.get('/tickets/my-tickets'),
        api.get('/events')
      ]);

      setUpcomingEvents(upcomingRes.data.data || []);
      const eventList = eventsRes.data.data.events || eventsRes.data.data || [];
      setAllEvents(eventList);

      const ticketsList = ticketsRes.data.data.tickets || [];
      setStats({
        totalTickets: ticketsList.length,
        upcomingEvents: (upcomingRes.data.data || []).length,
        attendedEvents: ticketsList.filter((t: any) => t.status === 'USED').length,
      });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  const fetchAllEvents = async () => {
    const params = search ? `?search=${search}` : '';
    const response = await api.get(`/events${params}`);
    setAllEvents(response.data.data.events || []);
  };

  const fetchEventDetails = async (eventId: string) => {
    const response = await api.get(`/events/${eventId}`);
    setSelectedEvent(response.data.data);
  };

  const handlePurchaseTicket = async () => {
    if (!selectedEvent) return;
    setPurchasing(true);
    try {
      const ticketResponse = await api.post('/tickets/purchase', {
        eventId: selectedEvent.id,
      });
      const { authorizationUrl } = ticketResponse.data.data;
      toast.success('Redirecting to payment...');
      window.location.href = authorizationUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to purchase ticket');
      setPurchasing(false);
    }
  };

  const fetchTickets = async () => {
    const params = ticketFilter !== 'all' ? `?status=${ticketFilter}` : '';
    const response = await api.get(`/tickets/my-tickets${params}`);
    setTickets(response.data.data.tickets || []);
  };

  const fetchTicketDetails = async (ticketId: string) => {
    const response = await api.get(`/tickets/${ticketId}`);
    setSelectedTicket(response.data.data);
  };

  const fetchPayments = async () => {
    const response = await api.get('/payments/history');
    setPayments(response.data.data.payments || []);
  };

  const goBack = () => {
    if (selectedEvent) {
      setSelectedEvent(null);
      navigate('/eventee/events');
    } else if (selectedTicket) {
      setSelectedTicket(null);
      navigate('/eventee/tickets');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; icon: any; label?: string }> = {
      CONFIRMED: { class: 'badge-success', icon: CheckCircle, label: 'Confirmed' },
      PENDING: { class: 'badge-warning', icon: Clock, label: 'Pending Payment' },
      USED: { class: 'badge-info', icon: CheckCircle, label: 'Attended' },
      CANCELLED: { class: 'badge-error', icon: XCircle, label: 'Cancelled' },
    };
    const badge = badges[status] || { class: 'badge-warning', icon: Clock, label: status };
    const Icon = badge.icon;
    return (
      <span className={`badge ${badge.class}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const renderDashboard = () => (
    <>
      <div style={{ 
        padding: '20px', 
        background: '#fee2e2', 
        border: '4px dashed red', 
        marginBottom: '30px', 
        textAlign: 'center',
        borderRadius: '15px'
      }}>
        <h2 style={{ color: '#991b1b', marginBottom: '10px' }}>Final Year Project Debugger</h2>
        <button 
          onClick={() => navigate('/eventee/create-event')}
          style={{ 
            padding: '15px 30px', 
            background: '#ef4444', 
            color: 'white', 
            fontWeight: 'bold', 
            borderRadius: '8px', 
            cursor: 'pointer'
          }}
        >
          + CLICK TO OPEN CREATE EVENT FORM
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Ticket size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Total Tickets</p>
            <h3 className="stat-value">{stats.totalTickets}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Clock size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Upcoming Events</p>
            <h3 className="stat-value">{stats.upcomingEvents}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><TrendingUp size={24} /></div>
          <div className="stat-content">
            <p className="stat-label">Events Attended</p>
            <h3 className="stat-value">{stats.attendedEvents}</h3>
          </div>
        </div>
      </div>

      <div className="quick-actions" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button onClick={() => navigate('/eventee/create-event')} className="action-card">
            <PlusCircle size={24} />
            <span>Create New Event</span>
          </button>
          <button onClick={() => { setActiveTab('events'); navigate('/eventee/events'); }} className="action-card">
            <Search size={24} />
            <span>Browse Events</span>
          </button>
          <button onClick={() => { setActiveTab('tickets'); navigate('/eventee/tickets'); }} className="action-card">
            <Ticket size={24} />
            <span>My Tickets</span>
          </button>
        </div>
      </div>
    </>
  );

  const renderEvents = () => (
    <>
      {selectedEvent ? (
        <div className="event-detail-view">
          <button onClick={goBack} className="btn btn-secondary mb-3"><ArrowLeft size={20} /> Back</button>
          <h2>{selectedEvent.title}</h2>
          <p>{selectedEvent.description}</p>
          <button onClick={handlePurchaseTicket} className="btn btn-primary" disabled={purchasing}>
            {purchasing ? 'Processing...' : `Buy Ticket - ₦${selectedEvent.ticketPrice}`}
          </button>
        </div>
      ) : (
        <div className="events-list">
          <div className="search-bar mb-4">
            <input type="text" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="input" />
          </div>
          <div className="events-grid">
            {allEvents.map(event => (
              <div key={event.id} className="event-card" onClick={() => navigate(`/eventee/events/${event.id}`)}>
                <h3>{event.title}</h3>
                <p>{event.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderTickets = () => (
    <div className="tickets-view">
      {selectedTicket ? (
        <div className="ticket-detail">
          <button onClick={goBack} className="btn btn-secondary mb-3"><ArrowLeft size={20} /> Back</button>
          <h3>{selectedTicket.event.title}</h3>
          <QRCodeSVG value={selectedTicket.ticketNumber} size={200} />
          <p>Ticket: {selectedTicket.ticketNumber}</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map(t => (
            <div key={t.id} className="event-card" onClick={() => navigate(`/eventee/tickets/${t.id}`)}>
              <h4>{t.event.title}</h4>
              {getStatusBadge(t.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPayments = () => (
    <div className="payments-view">
      <table className="table">
        <thead>
          <tr><th>Event</th><th>Amount</th><th>Status</th><th>Reference</th></tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{p.ticket.event.title}</td>
              <td>₦{p.amount.toLocaleString()}</td>
              <td>{p.status}</td>
              <td>{p.reference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading && !selectedEvent && !selectedTicket) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <h1 className="dashboard-title">
          {activeTab === 'dashboard' && `Welcome back, Destiny!`}
          {activeTab === 'events' && 'Browse All Events'}
          {activeTab === 'tickets' && 'My Tickets'}
          {activeTab === 'payments' && 'Payment History'}
        </h1>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'events' && renderEvents()}
      {activeTab === 'tickets' && renderTickets()}
      {activeTab === 'payments' && renderPayments()}
    </div>
  );
};

export default EventeeDashboard;