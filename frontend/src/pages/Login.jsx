import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Building2, Lock, User, ArrowRight } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const { error, success } = useNotification();

  const [selectedRole, setSelectedRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return error('Please enter both username and password.');
    }
    setLoading(true);

    try {
      const user = await login(username.trim(), password.trim(), selectedRole);
      success(`Welcome back, ${user.name}!`);
    } catch (err) {
      error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleTabClick = (roleKey) => {
    setSelectedRole(roleKey);
    // Keep username and password completely blank for user manual entry
    setUsername('');
    setPassword('');
  };

  return (
    <div
      className="login-screen"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1e293b 0%, #0b0f17 70%)',
        padding: '20px',
        position: 'relative'
      }}
    >
      {/* Background Decorative Glow */}
      <div
        className="login-glow"
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '300px',
          background: 'rgba(245, 158, 11, 0.08)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      <div
        className="card-glass login-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Brand Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px var(--primary-glow)',
              marginBottom: '14px'
            }}
          >
            <Building2 size={32} color="#0b0f17" />
          </div>

          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-heading)'
            }}
          >
            DECO<span style={{ color: 'var(--primary)' }}>STONE</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Material Management System (MMS)
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="login-username">
              {selectedRole.toUpperCase()} Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)'
                }}
              />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder={`Enter ${selectedRole} username`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)'
                }}
              />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: '4px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Sign In as ${selectedRole === 'admin' ? 'Admin' : selectedRole === 'manager' ? 'Manager' : 'Supervisor'}`}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Role Portal Selection at Downside */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
          <div
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '10px'
            }}
          >
            Select Login Role Portal
          </div>

          <div className="login-role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              aria-pressed={selectedRole === 'admin'}
              className={`btn btn-sm ${selectedRole === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.78rem', padding: '8px 4px', fontWeight: 600 }}
              onClick={() => handleRoleTabClick('admin')}
            >
              👑 Admin Login
            </button>
            <button
              type="button"
              aria-pressed={selectedRole === 'manager'}
              className={`btn btn-sm ${selectedRole === 'manager' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.78rem', padding: '8px 4px', fontWeight: 600 }}
              onClick={() => handleRoleTabClick('manager')}
            >
              💼 Manager Login
            </button>
            <button
              type="button"
              aria-pressed={selectedRole === 'supervisor'}
              className={`btn btn-sm ${selectedRole === 'supervisor' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.78rem', padding: '8px 4px', fontWeight: 600 }}
              onClick={() => handleRoleTabClick('supervisor')}
            >
              🏢 Supervisor Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
