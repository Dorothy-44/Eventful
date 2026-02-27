import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import CreatorDashboard from './pages/CreatorDashboard';
import EventeeDashboard from './pages/EventeeDashboard';
import SharedPages from './pages/SharedPages';

const App: React.FC = () => {
  const { user, loading } = useApp();

  if (loading) return null; 

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<Auth />} />

      {/* Creator Routes */}
      <Route
        path="/creator/*"
        element={
          <RoleRoute role="CREATOR">
            <Layout>
              <Routes>
                {/* index handles the base /creator path */}
                <Route index element={<CreatorDashboard />} />
                <Route path="dashboard" element={<CreatorDashboard />} />
                <Route path="events" element={<CreatorDashboard />} />
                <Route path="create" element={<CreatorDashboard />} />
                <Route path="edit/:id" element={<CreatorDashboard />} />
                <Route path="attendees/:id" element={<CreatorDashboard />} />
                <Route path="scan" element={<CreatorDashboard />} />
                <Route path="analytics" element={<CreatorDashboard />} />
                {/* Nested Shared Pages */}
                <Route path="profile" element={<SharedPages />} />
                <Route path="notifications" element={<SharedPages />} />
              </Routes>
            </Layout>
          </RoleRoute>
        }
      />

      {/* Eventee Routes */}
      <Route
        path="/eventee/*"
        element={
          <RoleRoute role="EVENTEE">
            <Layout>
              <Routes>
                <Route index element={<EventeeDashboard />} />
                <Route path="dashboard" element={<EventeeDashboard />} />
                <Route path="events" element={<EventeeDashboard />} />
                {/* Specific Event Details */}
                <Route path="events/:id" element={<EventeeDashboard />} />
                <Route path="tickets" element={<EventeeDashboard />} />
                <Route path="tickets/:id" element={<EventeeDashboard />} />
                <Route path="payments" element={<EventeeDashboard />} />
                {/* Shared Creator Form for testing */}
                <Route path="create-event" element={<CreatorDashboard />} />
                {/* Nested Shared Pages */}
                <Route path="profile" element={<SharedPages />} />
                <Route path="notifications" element={<SharedPages />} />
              </Routes>
            </Layout>
          </RoleRoute>
        }
      />

      {/* Shared pages (External) */}
      <Route path="/shared/*" element={<SharedPages />} />

      {/* Default Redirect Logic */}
      <Route 
        path="*" 
        element={
          <Navigate 
            to={user ? (user.role === 'CREATOR' ? '/creator/dashboard' : '/eventee/dashboard') : '/auth'} 
            replace 
          />
        } 
      />
    </Routes>
  );
};

export default App;