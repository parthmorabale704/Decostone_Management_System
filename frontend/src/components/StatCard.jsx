import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = '#f59e0b', onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </p>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)' }}>
          {value}
        </h3>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {trend && (
              trend > 0 ? (
                <TrendingUp size={14} color="#10b981" />
              ) : (
                <TrendingDown size={14} color="#f43f5e" />
              )
            )}
            {subtitle}
          </p>
        )}
      </div>
      {Icon && (
        <div className="stat-icon" style={{ background: `${color}18`, color: color }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}

export function StockBadge({ status, quantity, minStock, unit = '' }) {
  let badgeClass = 'badge-in-stock';
  let label = 'In Stock';

  if (status === 'OUT_OF_STOCK' || quantity === 0) {
    badgeClass = 'badge-out-of-stock';
    label = 'Out of Stock';
  } else if (status === 'LOW_STOCK' || (minStock !== undefined && quantity <= minStock)) {
    badgeClass = 'badge-low-stock';
    label = 'Low Stock';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block'
        }}
      />
      {label} {quantity !== undefined ? `(${quantity} ${unit})` : ''}
    </span>
  );
}
