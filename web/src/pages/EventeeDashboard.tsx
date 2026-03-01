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
  ArrowLeft,
  CheckCircle,
  XCircle,
  CreditCard,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

type TabType = 'dashboard' | 'events' | 'tickets' | 'payments';

interface EventeeDashboardProps {
  view?: TabType;
}

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

const EventeeDashboard = ({ view: viewProp }: EventeeDashboardProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>(viewProp || 'dashboard');
  const [loading, setLoading] = useState(true);

  const [upcomingEvents, setUpcomingEvents] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState({ totalTickets: 0, upcomingEvents: 0, attendedEvents: 0 });
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const tab = viewProp || 'dashboard';
    setActiveTab(tab);
    setSelectedEvent(null);
    setSelectedTicket(null);

    if (tab === 'events' && id) fetchEventDetails(id);
    if (tab === 'tickets' && id) fetchTicketDetails(id);
  }, [viewProp, id]);

  useEffect(() => {
    loadData();
  }, [activeTab, search, ticketFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard': await fetchDashboardData(); break;
        case 'events': if (!id) await fetchAllEvents(); break;
        case 'tickets': if (!id) await fetchTickets(); break;
        case 'payments': await fetchPayments(); break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [upcomingRes, ticketsRes] = await Promise.all([
        api.get('/tickets/my-upcoming'),
        api.get('/tickets/my-tickets'),
      ]);
      setUpcomingEvents(upcomingRes.data.data || []);
      const ticketsList = ticketsRes.data.data.tickets || [];
      setStats({
        totalTickets: ticketsList.length,
        upcomingEvents: (upcomingRes.data.data || []).length,
        attendedEvents: ticketsList.filter((t: any) => t.status === 'USED').length,
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  const fetchAllEvents = async () => {
    const params = search ? `?search=${search}` : '';
    const response = await api.get(`/events${params}`);
    setAllEvents(response.data.data.events || response.data.data || []);
  };

  const fetchEventDetails = async (eventId: string) => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setSelectedEvent(response.data.data);
    } catch {
      toast.error('Could not load event details');
    }
  };

  const fetchTickets = async () => {
    const params = ticketFilter !== 'all' ? `?status=${ticketFilter}` : '';
    const response = await api.get(`/tickets/my-tickets${params}`);
    setTickets(response.data.data.tickets || []);
  };

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(response.data.data);
    } catch {
      toast.error('Could not load ticket details');
    }
  };

  const fetchPayments = async () => {
    const response = await api.get('/payments/history');
    setPayments(response.data.data.payments || []);
  };

  const handlePurchaseTicket = async () => {
    if (!selectedEvent) return;
    setPurchasing(true);
    try {
      const ticketResponse = await api.post('/tickets/purchase', { eventId: selectedEvent.id });
      const { authorizationUrl } = ticketResponse.data.data;
      toast.success('Redirecting to payment...');
      window.location.href = authorizationUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to purchase ticket');
      setPurchasing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; bg: string; label: string }> = {
      CONFIRMED: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Confirmed' },
      PENDING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Pending Payment' },
      USED: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', label: 'Attended' },
      CANCELLED: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Cancelled' },
    };
    const s = map[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: status };
    return (
      <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', borderRadius: '20px', background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const renderDashboard = () => (
    <>
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

      <div style={{ marginTop: '2rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No upcoming events</p>
            <button onClick={() => navigate('/eventee/events')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Browse Events
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingEvents.map((ticket) => (
              <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <div>
                  <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{ticket.event.title}</h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={13} /> {ticket.event.location}
                  </p>
                  <p style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                    <Clock size={13} /> {new Date(ticket.event.eventDate).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => navigate(`/eventee/tickets/${ticket.id}`)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                  View Ticket
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderEvents = () => (
    <>
      {selectedEvent ? (
        <div>
          <button onClick={() => { setSelectedEvent(null); navigate('/eventee/events'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '1.5rem', padding: 0 }}>
            <ArrowLeft size={18} /> Back to Events
          </button>
          {selectedEvent.imageUrl && (
            <img src={selectedEvent.imageUrl} alt={selectedEvent.title} style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1.5rem' }} />
          )}
          <h2 style={{ fontWeight: '700', fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedEvent.title}</h2>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={15} /> {new Date(selectedEvent.eventDate).toLocaleString()}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={15} /> {selectedEvent.location}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Ticket size={15} /> {selectedEvent.availableTickets} tickets left</span>
          </div>
          <p style={{ opacity: 0.8, lineHeight: 1.6, marginBottom: '2rem' }}>{selectedEvent.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <div>
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Ticket Price</p>
              <p style={{ fontWeight: '700', fontSize: '1.5rem', color: 'var(--accent-primary)' }}>₦{Number(selectedEvent.ticketPrice).toLocaleString()}</p>
            </div>
            <button onClick={handlePurchaseTicket} className="btn btn-primary" disabled={purchasing || selectedEvent.availableTickets === 0}>
              {purchasing ? 'Processing...' : selectedEvent.availableTickets === 0 ? 'Sold Out' : 'Buy Ticket'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input type="text" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
          </div>
          {allEvents.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', opacity: 0.6 }}>
              <Calendar size={48} style={{ marginBottom: '1rem' }} />
              <p>No events found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {allEvents.map((event) => (
                <div key={event.id} onClick={() => navigate(`/eventee/events/${event.id}`)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}>
                  {event.imageUrl && <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{event.title}</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                      <Calendar size={13} /> {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem' }}>
                      <MapPin size={13} /> {event.location}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>₦{Number(event.ticketPrice).toLocaleString()}</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{event.availableTickets} left</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  const renderTickets = () => (
    <>
      {selectedTicket ? (
        <div>
          <button onClick={() => { setSelectedTicket(null); navigate('/eventee/tickets'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '1.5rem', padding: 0 }}>
            <ArrowLeft size={18} /> Back to Tickets
          </button>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{selectedTicket.event.title}</h3>
            <p style={{ opacity: 0.7, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <Calendar size={14} /> {new Date(selectedTicket.event.eventDate).toLocaleString()}
            </p>
            <p style={{ opacity: 0.7, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <MapPin size={14} /> {selectedTicket.event.location}
            </p>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', display: 'inline-block', marginBottom: '1rem' }}>
              <QRCodeSVG value={selectedTicket.ticketNumber} size={180} />
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', opacity: 0.6, marginBottom: '1rem' }}>{selectedTicket.ticketNumber}</p>
            {getStatusBadge(selectedTicket.status)}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['all', 'CONFIRMED', 'PENDING', 'USED', 'CANCELLED'].map((f) => (
              <button key={f} onClick={() => setTicketFilter(f)} className={ticketFilter === f ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', textTransform: 'capitalize' }}>
                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          {tickets.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', opacity: 0.6 }}>
              <Ticket size={48} style={{ marginBottom: '1rem' }} />
              <p>No tickets found</p>
              <button onClick={() => navigate('/eventee/events')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Events</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} onClick={() => navigate(`/eventee/tickets/${ticket.id}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', cursor: 'pointer' }}>
                  <div>
                    <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{ticket.event.title}</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{new Date(ticket.event.eventDate).toLocaleDateString()}</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.5, fontFamily: 'monospace', marginTop: '0.2rem' }}>{ticket.ticketNumber}</p>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  const renderPayments = () => (
    <>
      {payments.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', opacity: 0.6 }}>
          <CreditCard size={48} style={{ marginBottom: '1rem' }} />
          <p>No payment history yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {payments.map((payment) => (
            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <div>
                <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{payment.ticket.event.title}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.5, fontFamily: 'monospace' }}>{payment.reference}</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.2rem' }}>{new Date(payment.createdAt).toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>₦{Number(payment.amount).toLocaleString()}</p>
                {getStatusBadge(payment.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
          {activeTab === 'dashboard' && 'My Dashboard'}
          {activeTab === 'events' && (selectedEvent ? selectedEvent.title : 'Browse Events')}
          {activeTab === 'tickets' && (selectedTicket ? 'Ticket Details' : 'My Tickets')}
          {activeTab === 'payments' && 'Payment History'}
        </h1>
        <p style={{ opacity: 0.7 }}>Discover and attend amazing events</p>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'events' && renderEvents()}
      {activeTab === 'tickets' && renderTickets()}
      {activeTab === 'payments' && renderPayments()}
    </div>
  );
};

export default EventeeDashboard;
