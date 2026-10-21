import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Settings as SettingsIcon, Lock, Building, Bell, Save, ShieldCheck } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const { success, error } = useNotification();

  // Settings State
  const [settings, setSettings] = useState({
    company_name: 'DecoStone Materials LLP',
    currency_symbol: '₹',
    low_stock_threshold_alert: 'true'
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.getSettings();
        if (res.success && res.settings) {
          setSettings((prev) => ({ ...prev, ...res.settings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoadingSettings(true);
    try {
      await api.updateSettings(settings);
      success('System configuration saved successfully.');
    } catch (err) {
      error(err.message || 'Failed to save settings.');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return error('New passwords do not match.');
    }
    if (newPassword.length < 6) {
      return error('Password must be at least 6 characters long.');
    }

    setPasswordLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      error(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Settings & Profile</h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
          DecoStone enterprise parameters, user security and system thresholds
        </p>
      </div>

      <div className="grid-cols-2">
        {/* System Settings (Admin only) */}
        {user?.role === 'admin' && (
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="var(--primary)" /> Enterprise Configuration
            </h3>

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label">Company / Brand Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.currency_symbol}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Automated Low-Stock Notifications</label>
                <select
                  className="form-control"
                  value={settings.low_stock_threshold_alert}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold_alert: e.target.value })}
                >
                  <option value="true">Enabled (Alert on Dashboard & Topbar)</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loadingSettings} style={{ marginTop: '10px' }}>
                <Save size={16} /> {loadingSettings ? 'Saving...' : 'Save Enterprise Settings'}
              </button>
            </form>
          </div>
        )}

        {/* User Security & Profile Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--primary)" /> Security & Password
          </h3>

          <div
            style={{
              background: 'var(--bg-input)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}
          >
            <div><strong>Active User:</strong> {user?.name} (@{user?.username})</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
              <strong>Role:</strong> {user?.role?.toUpperCase()} • <strong>Location:</strong> {user?.assigned_godown_name || 'Central Master'}
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-secondary" disabled={passwordLoading} style={{ marginTop: '10px' }}>
              <ShieldCheck size={16} color="#10b981" /> {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
