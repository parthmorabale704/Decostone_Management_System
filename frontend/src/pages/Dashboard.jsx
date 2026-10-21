import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { StatCard } from '../components/StatCard';
import { StockBadge } from '../components/StockBadge';
import {
  Boxes,
  Layers,
  Warehouse,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  TrendingUp,
  RefreshCw,
  Eye,
  Plus
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

export function Dashboard({ onOpenTransactionModal, onSelectMaterial, onSelectPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (silent = false) => {
    if (!silent && !data) setLoading(true);
    try {
      const res = await api.getDashboardSummary();
      if (res.success) {
        setData(res.summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useStockSync(() => {
    fetchSummary(true);
  });

  if (loading && !data) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '100px 0' }}>
        <RefreshCw size={36} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading real-time warehouse metrics...</p>
      </div>
    );
  }

  const godownsData = data?.godowns?.map((g) => ({
    name: g.name,
    stock: g.total_stock,
    materials: g.active_materials
  })) || [];

  const categoryData = data?.categoryDistribution?.map((c) => ({
    name: c.name,
    value: c.total_stock
  })) || [];

  const trendData = data?.movementTrends || [];

  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Warehouse Central Command</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Real-time multi-godown material tracking, audit logs & inventory levels
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchSummary}>
            <RefreshCw size={14} /> Refresh Data
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN')}
          >
            <Plus size={14} /> Quick Stock IN
          </button>
        </div>
      </div>

      {/* Row 1: High-level KPI Stat Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Total Stock Units"
          value={data?.totalStockQty?.toLocaleString() || '0'}
          subtitle={`Valuation: ₹${(data?.totalInventoryValue || 0).toLocaleString()}`}
          icon={Boxes}
          color="#f59e0b"
          onClick={() => onSelectPage('materials')}
        />

        <StatCard
          title="Active Materials"
          value={data?.totalMaterials || 0}
          subtitle={`Across ${data?.totalCategories || 0} Categories`}
          icon={Layers}
          color="#06b6d4"
          onClick={() => onSelectPage('materials')}
        />

        <StatCard
          title="Low Stock Alerts"
          value={data?.lowStockCount || 0}
          subtitle="Items at or below safety level"
          icon={AlertTriangle}
          color={data?.lowStockCount > 0 ? '#f43f5e' : '#10b981'}
          onClick={() => onSelectPage('low-stock')}
        />

        <StatCard
          title="Today's Material Flow"
          value={`${data?.todayStats?.today_in_qty || 0} IN / ${data?.todayStats?.today_out_qty || 0} OUT`}
          subtitle={`${data?.todayStats?.today_transfer_qty || 0} Units Transferred`}
          icon={TrendingUp}
          color="#10b981"
          onClick={() => onSelectPage('stock-history')}
        />
      </div>

      {/* Row 2: 4 Godowns Real-time Stock Cards */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Warehouse size={18} color="var(--primary)" /> Godown Inventory Distribution
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {data?.godowns?.length || 0} {data?.godowns?.length === 1 ? 'Warehouse' : 'Warehouses'}
          </span>
        </div>

        <div className="grid-cols-4">
          {data?.godowns?.map((g) => (
            <div
              key={g.id}
              className="card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onSelectPage(`godown-${g.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-info" style={{ marginBottom: '6px' }}>{g.code || 'GDN'}</span>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{g.name}</h4>
                </div>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Warehouse size={18} />
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {g.total_stock?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Stock Units</div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {g.active_materials} items ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Interactive Charts */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Godown Wise Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>
            Stock Balance by Warehouse
          </h3>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer>
              <BarChart data={godownsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} />
                <YAxis stroke="var(--text-dim)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                />
                <Bar dataKey="stock" name="Total Units" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>
            Category-wise Stock Breakdown
          </h3>
          <div style={{ width: '100%', height: '260px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent movement trend */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>
          Stock Movement — Last 30 Days
        </h3>
        {trendData.length === 0 ? (
          <div style={{ height: 240, display: 'grid', placeItems: 'center', color: 'var(--text-dim)' }}>
            No stock movement recorded in the last 30 days.
          </div>
        ) : (
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={12} />
                <YAxis stroke="var(--text-dim)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="stock_in" name="Stock In" stroke="#10b981" fill="#10b981" fillOpacity={0.16} />
                <Area type="monotone" dataKey="stock_out" name="Stock Out" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.14} />
                <Area type="monotone" dataKey="transfers" name="Transfers" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 4: Low Stock Alert Table & Recent Transactions Ledger */}
      <div className="grid-cols-2">
        {/* Low Stock Items */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#f59e0b" /> Low Stock Warning
            </h3>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => onSelectPage('low-stock')}
            >
              View All
            </button>
          </div>

          <div className="table-responsive" style={{ maxHeight: '280px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.lowStockMaterials?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                      All items meet safety threshold levels.
                    </td>
                  </tr>
                ) : (
                  data?.lowStockMaterials?.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => onSelectMaterial && onSelectMaterial(m.id)}
                        >
                          {m.name}
                        </button>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{m.sku}</div>
                      </td>
                      <td>{m.category_name}</td>
                      <td style={{ fontWeight: 800, color: m.total_stock === 0 ? '#f43f5e' : '#f59e0b' }}>
                        {m.total_stock} {m.unit}
                      </td>
                      <td>{m.min_stock_level} {m.unit}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN', m.id)}
                        >
                          + IN
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions Ledger */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Live Stock Movement Feed
            </h3>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => onSelectPage('stock-history')}
            >
              Full Ledger
            </button>
          </div>

          <div className="table-responsive" style={{ maxHeight: '280px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Material</th>
                  <th>Godown</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentTransactions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                      No recent transactions found.
                    </td>
                  </tr>
                ) : (
                  data?.recentTransactions?.map((tx) => {
                    let badgeClass = 'badge-info';
                    if (tx.transaction_type === 'STOCK_IN' || tx.transaction_type === 'TRANSFER_IN' || tx.transaction_type === 'OPENING_STOCK') {
                      badgeClass = 'badge-success';
                    } else if (tx.transaction_type === 'STOCK_OUT' || tx.transaction_type === 'TRANSFER_OUT') {
                      badgeClass = 'badge-danger';
                    } else if (tx.transaction_type === 'ADJUSTMENT') {
                      badgeClass = 'badge-warning';
                    }

                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>
                            {tx.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{tx.material_name}</td>
                        <td>{tx.godown_name}</td>
                        <td style={{ fontWeight: 700 }}>
                          {tx.quantity} {tx.unit}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
