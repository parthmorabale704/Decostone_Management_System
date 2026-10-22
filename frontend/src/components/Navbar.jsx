import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Bell, Sun, Moon, Plus, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, SlidersHorizontal, UserRound, LogOut, TriangleAlert, Menu, ChevronDown, CheckCheck
} from 'lucide-react';

export function Navbar({ onOpenTransactionModal, onSelectPage, onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);
  const notificationStorageKey = `decostone_read_low_stock_${user?.id || user?.username || 'user'}`;
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(notificationStorageKey) || '[]');
    } catch {
      return [];
    }
  });
  const [openMenu, setOpenMenu] = useState(null);

  const unreadCount = lowStockItems.filter((item) => (
    !readNotificationIds.includes(`${item.godown_id}-${item.material_id}`)
  )).length;

  const markAllNotificationsRead = () => {
    const ids = lowStockItems.map((item) => `${item.godown_id}-${item.material_id}`);
    setReadNotificationIds(ids);
    localStorage.setItem(notificationStorageKey, JSON.stringify(ids));
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLowStock = async () => {
      try {
        const response = await api.getLowStock();
        if (isMounted && response.success) {
          setLowStockItems(response.lowStockItems || []);
          setHasLoadedNotifications(true);
        }
      } catch {
        // Keep the header usable when notifications are temporarily unavailable.
      }
    };
    fetchLowStock();
    const timer = window.setInterval(fetchLowStock, 60_000);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    try {
      setReadNotificationIds(JSON.parse(localStorage.getItem(notificationStorageKey) || '[]'));
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!hasLoadedNotifications) return;
    const activeIds = new Set(lowStockItems.map((item) => `${item.godown_id}-${item.material_id}`));
    setReadNotificationIds((current) => {
      const next = current.filter((id) => activeIds.has(id));
      if (next.length !== current.length) {
        localStorage.setItem(notificationStorageKey, JSON.stringify(next));
      }
      return next;
    });
  }, [hasLoadedNotifications, lowStockItems, notificationStorageKey]);

  useEffect(() => {
    if (!openMenu) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [openMenu]);

  const canStockIn = user?.role === 'admin' || user?.can_stock_in;
  const canStockOut = user?.role === 'admin' || user?.can_stock_out;
  const canTransfer = user?.role === 'admin' || user?.role === 'manager';
  const canAdjust = user?.role === 'admin' || (user?.role === 'manager' && user?.can_adjust);
  const openTransaction = (type) => {
    setOpenMenu(null);
    onOpenTransactionModal?.(type);
  };

  return (
    <header className="app-navbar">
      <div className="navbar-heading">
        <button type="button" className="mobile-menu-button btn-icon" onClick={onMenuClick} aria-label="Open main navigation">
          <Menu size={20} />
        </button>
        <div className="navbar-page-copy">
          <div className="navbar-eyebrow">{user?.role || 'User'} workspace</div>
          <div className="navbar-page-title">{user?.assigned_godown_name || 'All warehouses'}</div>
        </div>
      </div>

      <div className="navbar-actions">
        {(canStockIn || canStockOut || canTransfer || canAdjust) && (
          <div className="navbar-menu-wrap">
            <button
              type="button"
              className="btn btn-primary navbar-action-trigger"
              onClick={() => setOpenMenu(openMenu === 'actions' ? null : 'actions')}
              aria-expanded={openMenu === 'actions'}
              aria-haspopup="menu"
            >
              <Plus size={17} aria-hidden="true" />
              <span>New transaction</span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {openMenu === 'actions' && (
              <div className="header-popover action-popover" role="menu" aria-label="New transaction">
                {canStockIn && <button role="menuitem" onClick={() => openTransaction('STOCK_IN')}><ArrowDownToLine size={17} /> Receive stock</button>}
                {canStockOut && <button role="menuitem" onClick={() => openTransaction('STOCK_OUT')}><ArrowUpFromLine size={17} /> Dispatch stock</button>}
                {canTransfer && <button role="menuitem" onClick={() => openTransaction('TRANSFER')}><ArrowLeftRight size={17} /> Transfer stock</button>}
                {canAdjust && <button role="menuitem" onClick={() => openTransaction('ADJUSTMENT')}><SlidersHorizontal size={17} /> Adjust stock</button>}
              </div>
            )}
          </div>
        )}

        <div className="navbar-menu-wrap">
          <button
            type="button"
            className="btn-icon header-icon-button notification-trigger"
            onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')}
            aria-label={`Low stock notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={openMenu === 'notifications'}
            aria-haspopup="dialog"
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {openMenu === 'notifications' && (
            <section className="header-popover notification-popover" role="dialog" aria-label="Low stock notifications">
              <div className="popover-heading">
                <div><TriangleAlert size={17} /><strong>Low stock</strong></div>
                <span className="text-muted">{unreadCount} unread</span>
              </div>
              {lowStockItems.length === 0 ? (
                <p className="popover-empty">No materials are below their minimum stock level.</p>
              ) : (
                <div className="notification-list">
                  {lowStockItems.slice(0, 6).map((item) => (
                    <div className="notification-item" key={`${item.godown_id}-${item.material_id}`}>
                      <strong>{item.material_name}</strong>
                      <span>{item.godown_name} · {item.current_stock} / {item.min_stock_level} {item.unit} · {readNotificationIds.includes(`${item.godown_id}-${item.material_id}`) ? 'Read' : 'Unread'}</span>
                    </div>
                  ))}
                </div>
              )}
              {lowStockItems.length > 0 && (
                <button
                  type="button"
                  className="notification-read-all"
                  onClick={markAllNotificationsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck size={16} aria-hidden="true" />
                  {unreadCount === 0 ? 'All notifications read' : 'Mark all as read'}
                </button>
              )}
              <button
                type="button"
                className="popover-link"
                onClick={() => {
                  setOpenMenu(null);
                  onSelectPage?.('low-stock');
                }}
              >View low-stock page</button>
            </section>
          )}
        </div>

        <button
          type="button"
          className="btn-icon header-icon-button theme-button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </button>

        <div className="navbar-menu-wrap">
          <button
            type="button"
            className="account-trigger"
            onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
            aria-expanded={openMenu === 'account'}
            aria-haspopup="menu"
          >
            <span className="account-avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <span className="navbar-user-info">
              <strong>{user?.name || 'Account'}</strong>
              <small>{user?.role || 'User'}</small>
            </span>
            <ChevronDown className="account-chevron" size={15} aria-hidden="true" />
          </button>
          {openMenu === 'account' && (
            <div className="header-popover account-popover" role="menu" aria-label="Account menu">
              <button role="menuitem" onClick={() => { setOpenMenu(null); onSelectPage?.('settings'); }}>
                <UserRound size={17} /> Profile and security
              </button>
              <button role="menuitem" onClick={logout}><LogOut size={17} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
