import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

type AuthMode = 'login' | 'register';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useApp();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    navigate(`/${user.role.toLowerCase()}/dashboard`);
    return null;
  }

  // Login form state
  const [loginData, setLoginData] = useState({
    emailOrUsername: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'EVENTEE' as 'CREATOR' | 'EVENTEE',
  });

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(loginData.emailOrUsername, loginData.password);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(registerData);
      navigate('/');
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">🎵 Groove</h1>
          <h2 className="auth-title">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to your account'
              : 'Join the event revolution'}
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="auth-tabs">
          <button
            onClick={() => setMode('login')}
            className={`auth-tab ${mode === 'login' ? 'auth-tab-active' : ''}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`}
          >
            Sign Up
          </button>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="label">Email or Username</label>
              <input
                type="text"
                name="emailOrUsername"
                value={loginData.emailOrUsername}
                onChange={handleLoginChange}
                className="input"
                placeholder="Enter your email or username"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Username</label>
              <input
                type="text"
                name="username"
                value={registerData.username}
                onChange={handleRegisterChange}
                className="input"
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={registerData.firstName}
                  onChange={handleRegisterChange}
                  className="input"
                  placeholder="First name"
                />
              </div>

              <div className="form-group">
                <label className="label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={registerData.lastName}
                  onChange={handleRegisterChange}
                  className="input"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                className="input"
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="label">Account Type</label>
              <select
                name="role"
                value={registerData.role}
                onChange={handleRegisterChange}
                className="input"
                required
              >
                <option value="EVENTEE">Eventee (Attend Events)</option>
                <option value="CREATOR">Creator (Create Events)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;