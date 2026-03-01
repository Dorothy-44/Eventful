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
      <Route path="/auth" element={<Auth />} />

      <Route
        path="/creator/*"
        element={
          <RoleRoute role="CREATOR">
            <Layout>
              <Routes>
                <Route index element={<CreatorDashboard />} />
                <Route path="dashboard" element={<CreatorDashboard />} />
                <Route path="events" element={<CreatorDashboard view="events" />} />
                <Route path="create" element={<CreatorDashboard view="create" />} />
                <Route path="edit/:id" element={<CreatorDashboard view="edit" />} />
                <Route path="attendees/:id" element={<CreatorDashboard view="attendees" />} />
                <Route path="scan" element={<CreatorDashboard view="scan" />} />
                <Route path="analytics" element={<CreatorDashboard view="analytics" />} />
                <Route path="profile" element={<SharedPages />} />
                <Route path="notifications" element={<SharedPages />} />
              </Routes>
            </Layout>
          </RoleRoute>
        }
      />

      <Route
        path="/eventee/*"
        element={
          <RoleRoute role="EVENTEE">
            <Layout>
              <Routes>
                <Route index element={<EventeeDashboard view="dashboard" />} />
                <Route path="dashboard" element={<EventeeDashboard view="dashboard" />} />
                <Route path="events" element={<EventeeDashboard view="events" />} />
                <Route path="events/:id" element={<EventeeDashboard view="events" />} />
                <Route path="tickets" element={<EventeeDashboard view="tickets" />} />
                <Route path="tickets/:id" element={<EventeeDashboard view="tickets" />} />
                <Route path="payments" element={<EventeeDashboard view="payments" />} />
                <Route path="profile" element={<SharedPages />} />
                <Route path="notifications" element={<SharedPages />} />
              </Routes>
            </Layout>
          </RoleRoute>
        }
      />

      <Route path="/shared/*" element={<SharedPages />} />

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
