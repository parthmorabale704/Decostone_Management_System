import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Warehouse,
  Boxes,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sliders,
  History,
  AlertTriangle,
  FileBarChart,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  X
} from 'lucide-react';

export function Sidebar({ activePage, onSelectPage, godowns = [], isOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const [godownsOpen, setGodownsOpen] = useState(true);

  const role = user?.role || 'supervisor';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'supervisor'] },
    {
      id: 'godowns-parent',
      label: 'Warehouses',
      icon: Warehouse,
      roles: ['admin', 'manager', 'supervisor'],
      isGroup: true
    },
    { id: 'categories', label: 'Categories', icon: Layers, roles: ['admin', 'manager'] },
    { id: 'materials', label: 'Materials', icon: Boxes, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'stock-in', label: 'Stock IN', icon: ArrowDownLeft, roles: ['admin', 'manager', 'supervisor'], requiresPerm: 'can_stock_in' },
    { id: 'stock-out', label: 'Stock OUT', icon: ArrowUpRight, roles: ['admin', 'manager', 'supervisor'], requiresPerm: 'can_stock_out' },
    { id: 'transfers', label: 'Transfer Material', icon: ArrowRightLeft, roles: ['admin', 'manager'] },
    { id: 'adjustments', label: 'Stock Adjustment', icon: Sliders, roles: ['admin', 'manager'], requiresPerm: 'can_adjust' },
    { id: 'stock-history', label: 'Stock History', icon: History, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'low-stock', label: 'Low Stock Alerts', icon: AlertTriangle, roles: ['admin', 'manager'] },
    { id: 'reports', label: 'Reports & Exports', icon: FileBarChart, roles: ['admin', 'manager'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
    { id: 'audit-logs', label: 'System Audit Logs', icon: ShieldAlert, roles: ['admin'] },
    { id: 'settings', label: 'System Settings', icon: Settings, roles: ['admin', 'manager', 'supervisor'] }
  ];

  return (
    <>
    <div
      className={`sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
      onClick={onClose}
      aria-hidden="true"
    />
    <aside
      className={`app-sidebar ${isOpen ? 'is-open' : ''}`}
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        flexShrink: 0
      }}
    >
      {/* Brand Header */}
      <div
        className="sidebar-brand"
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px var(--primary-glow)'
          }}
        >
          <Building2 size={22} color="#0b0f17" />
        </div>
        <div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-main)',
              lineHeight: 1.1
            }}
          >
            DECO<span style={{ color: 'var(--primary)' }}>STONE</span>
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginTop: '2px'
            }}
          >
            Material Management
          </div>
        </div>
        <button className="sidebar-close-button btn-icon" onClick={onClose} aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {navItems.map((item) => {
          if (!item.roles.includes(role)) return null;

          if (item.requiresPerm && role !== 'admin' && !user?.[item.requiresPerm]) {
            return null;
          }

          if (item.isGroup) {
            return (
              <div key={item.id} style={{ margin: '4px 0' }}>
                <button
                  onClick={() => setGodownsOpen(!godownsOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-main)';
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Warehouse size={18} color="var(--primary)" />
                    <span>Godowns (1–4)</span>
                  </div>
                  {godownsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {godownsOpen && (
                  <div style={{ paddingLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      onClick={() => onSelectPage('godowns')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left',
                        background: activePage === 'godowns' ? 'var(--primary-light)' : 'none',
                        color: activePage === 'godowns' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activePage === 'godowns' ? 700 : 500,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.82rem'
                      }}
                    >
                      • All Warehouses Overview
                    </button>
                    {godowns.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => onSelectPage(`godown-${g.id}`)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          textAlign: 'left',
                          background: activePage === `godown-${g.id}` ? 'var(--primary-light)' : 'none',
                          color: activePage === `godown-${g.id}` ? 'var(--primary)' : 'var(--text-muted)',
                          fontWeight: activePage === `godown-${g.id}` ? 700 : 500,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        • {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.03) 100%)' : 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-main)';
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <Icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <button
          className="btn btn-sm btn-outline w-full"
          onClick={logout}
          style={{ justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
    </>
  );
}
