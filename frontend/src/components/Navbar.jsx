import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  Warehouse,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sliders,
  User,
  AlertTriangle,
  Menu
} from 'lucide-react';

export function Navbar({ onOpenTransactionModal, onSelectPage, onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    async function fetchLowStock() {
      try {
        const res = await api.getLowStock();
        if (res.success) {
          setLowStockItems(res.lowStockItems || []);
        }
      } catch (err) {
        // quiet error
      }
    }
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="app-navbar"
      style={{
        height: '70px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      {/* Left: Warehouse Context / Role Badge */}
      <div className="navbar-context-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="mobile-menu-button btn-icon" onClick={onMenuClick} aria-label="Open navigation">
          <Menu size={21} />
        </button>
        <div
          className="navbar-location"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-input)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem'
          }}
        >
          <Warehouse size={16} color="var(--primary)" />
          <span style={{ color: 'var(--text-muted)' }}>Location:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            {user?.assigned_godown_name || 'All Godowns (Central Master)'}
          </span>
        </div>

        <span className={`navbar-role badge badge-role-${user?.role || 'supervisor'}`}>
          {user?.role?.toUpperCase()}
        </span>
      </div>

      {/* Right Actions */}
      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Transaction Button */}
        <div className="navbar-quick-actions" style={{ display: 'flex', gap: '6px' }}>
          {user?.can_stock_in && (
            <button
              className="btn btn-sm btn-success"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN')}
              title="Stock IN"
            >
              <ArrowDownLeft size={14} />
              <span>Stock IN</span>
            </button>
          )}

          {user?.can_stock_out && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_OUT')}
              title="Stock OUT"
            >
              <ArrowUpRight size={14} />
              <span>Stock OUT</span>
            </button>
          )}

          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('TRANSFER')}
              title="Transfer Material"
            >
              <ArrowRightLeft size={14} />
              <span>Transfer</span>
            </button>
          )}
        </div>

        {/* Low Stock Alerts Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
            title="Notifications"
          >
            <Bell size={18} />
            {lowStockItems.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#f43f5e',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)'
                }}
              >
                {lowStockItems.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="card-glass"
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '320px',
                boxShadow: 'var(--shadow-lg)',
                padding: '16px',
                zIndex: 100
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} color="#f59e0b" /> Low Stock Alerts
                </h4>
                <span className="badge badge-warning">{lowStockItems.length} items</span>
              </div>

              {lowStockItems.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
                  All materials are adequately stocked.
                </p>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lowStockItems.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-input)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.material_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span>{item.godown_name}</span>
                        <span style={{ color: item.current_stock === 0 ? '#f43f5e' : '#f59e0b', fontWeight: 700 }}>
                          {item.current_stock} / min {item.min_stock_level} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-sm btn-outline w-full"
                style={{ marginTop: '12px' }}
                onClick={() => {
                  setShowNotifications(false);
                  if (onSelectPage) onSelectPage('low-stock');
                }}
              >
                View Low Stock Center
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
        </button>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                color: '#0b0f17',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="navbar-user-info" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                @{user?.username}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div
              className="card-glass"
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '200px',
                padding: '8px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100
              }}
            >
              <button
                className="btn btn-sm btn-outline w-full justify-start"
                style={{ marginBottom: '6px', border: 'none', textAlign: 'left' }}
                onClick={() => {
                  setShowUserMenu(false);
                  if (onSelectPage) onSelectPage('settings');
                }}
              >
                <User size={14} /> My Profile & Security
              </button>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

              <button
                className="btn btn-sm btn-danger w-full justify-start"
                style={{ border: 'none' }}
                onClick={logout}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
