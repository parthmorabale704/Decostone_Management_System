import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Warehouse, Boxes, Layers, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, SlidersHorizontal, History, TriangleAlert, ChartNoAxesColumn,
  Users, ShieldCheck, Settings, LogOut, ChevronDown, Building2, X, ClipboardList
} from 'lucide-react';

const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'manager', 'supervisor'] }
    ]
  },
  {
    label: 'Inventory',
    items: [
      { id: 'godowns', label: 'Warehouses', icon: Warehouse, roles: ['admin', 'manager', 'supervisor'] },
      { id: 'materials', label: 'Materials', icon: Boxes, roles: ['admin', 'manager', 'supervisor'] },
      { id: 'categories', label: 'Categories', icon: Layers, roles: ['admin', 'manager'] }
    ]
  },
  {
    label: 'Stock activity',
    items: [
      { id: 'stock-in', label: 'Stock received', icon: ArrowDownToLine, roles: ['admin', 'manager', 'supervisor'], permission: 'can_stock_in' },
      { id: 'stock-out', label: 'Stock dispatched', icon: ArrowUpFromLine, roles: ['admin', 'manager', 'supervisor'], permission: 'can_stock_out' },
      { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight, roles: ['admin', 'manager'] },
      { id: 'adjustments', label: 'Adjustments', icon: SlidersHorizontal, roles: ['admin', 'manager'], permission: 'can_adjust' },
      { id: 'stock-history', label: 'Stock history', icon: History, roles: ['admin', 'manager', 'supervisor'] }
    ]
  },
  {
    label: 'Insights',
    items: [
      { id: 'low-stock', label: 'Low stock', icon: TriangleAlert, roles: ['admin', 'manager'] },
      { id: 'reports', label: 'Reports', icon: ChartNoAxesColumn, roles: ['admin', 'manager'] },
      { id: 'operations', label: 'Operations', icon: ClipboardList, roles: ['admin', 'manager', 'supervisor'] }
    ]
  },
  {
    label: 'Administration',
    items: [
      { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
      { id: 'audit-logs', label: 'Audit log', icon: ShieldCheck, roles: ['admin'] },
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager', 'supervisor'] }
    ]
  }
];

export function Sidebar({ activePage, onSelectPage, godowns = [], isOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const [warehousesOpen, setWarehousesOpen] = useState(true);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelector('.sidebar-close-button')?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      if (isMobileLayout) document.querySelector('.mobile-menu-button')?.focus();
    };
  }, [isOpen, isMobileLayout, onClose]);

  const selectPage = (page) => {
    onSelectPage(page);
    onClose?.();
  };

  const isWarehouseActive = activePage === 'godowns' || activePage.startsWith('godown-');

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-label="Close navigation"
        tabIndex={isOpen ? 0 : -1}
      />
      <aside
        className={`app-sidebar ${isOpen ? 'is-open' : ''}`}
        aria-label="Main navigation"
        aria-hidden={isMobileLayout && !isOpen}
        inert={isMobileLayout && !isOpen}
      >
        <div className="sidebar-brand">
          <button
            type="button"
            className="sidebar-brand-home"
            onClick={() => selectPage('dashboard')}
            aria-label="DecoStone home"
            title="Go to Overview"
          >
            <span className="brand-mark" aria-hidden="true"><Building2 size={21} /></span>
            <span className="brand-copy">
              <span className="brand-name">Deco<span>Stone</span></span>
              <span className="brand-caption">Inventory workspace</span>
            </span>
          </button>
          <button className="sidebar-close-button btn-icon" onClick={onClose} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-navigation">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(user?.role) && (!item.permission || user?.role === 'admin' || user?.[item.permission])
            );
            if (!visibleItems.length) return null;

            return (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const selected = item.id === 'godowns' ? isWarehouseActive : activePage === item.id;
                  if (item.id === 'godowns') {
                    return (
                      <div key={item.id}>
                        <div className={`nav-row ${selected ? 'is-active' : ''}`}>
                          <button
                            type="button"
                            className="nav-link"
                            onClick={() => selectPage('godowns')}
                            aria-current={activePage === 'godowns' ? 'page' : undefined}
                          >
                            <Icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
                          </button>
                          <button
                            type="button"
                            className="nav-expand-button"
                            onClick={() => setWarehousesOpen((open) => !open)}
                            aria-label={`${warehousesOpen ? 'Collapse' : 'Expand'} warehouse list`}
                            aria-expanded={warehousesOpen}
                          >
                            <ChevronDown size={15} />
                          </button>
                        </div>
                        {warehousesOpen && (
                          <div className="nav-sublist" aria-label="Warehouses">
                            {godowns.map((godown) => {
                              const page = `godown-${godown.id}`;
                              return (
                                <button
                                  key={godown.id}
                                  type="button"
                                  className={`nav-sublink ${activePage === page ? 'is-active' : ''}`}
                                  onClick={() => selectPage(page)}
                                  aria-current={activePage === page ? 'page' : undefined}
                                >
                                  <span className="nav-subdot" aria-hidden="true" />
                                  <span>{godown.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      className={`nav-link ${selected ? 'is-active' : ''}`}
                      key={item.id}
                      onClick={() => selectPage(item.id)}
                      aria-current={selected ? 'page' : undefined}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="account-copy">
            <div className="account-name">{user?.name || 'User'}</div>
            <div className="account-role">{user?.role || 'Account'}</div>
          </div>
          <button type="button" className="sidebar-logout btn-icon" onClick={logout} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
