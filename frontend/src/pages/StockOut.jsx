import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockSync } from '../hooks/useStockSync';
import { ArrowUpRight, Plus, RefreshCw, AlertCircle } from 'lucide-react';

export function StockOut({ onOpenTransactionModal, onSelectMaterial }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStockOutHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getTransactions({ type: 'STOCK_OUT', limit: 100 });
      if (res.success) {
        setTransactions(res.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load stock OUT receipts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadStockOutHistory();
  }, []);

  useStockSync(() => {
    loadStockOutHistory(true);
  });

  const totalOutQty = transactions.reduce((acc, tx) => acc + tx.quantity, 0);

  return (
    <div className="page-wrapper">
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpRight size={28} color="#f43f5e" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Stock OUT Dispatches</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Dispatch inventory for sales, customer orders, project deliveries with negative stock prevention
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadStockOutHistory}>
            <RefreshCw size={14} /> Refresh
          </button>
          {user?.can_stock_out && (
            <button
              className="btn btn-danger"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_OUT')}
            >
              <Plus size={16} /> - New Stock OUT
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Outflow Logged</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f43f5e' }}>
            {totalOutQty.toLocaleString()} Units Dispatched
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Dispatches</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {transactions.length} Invoices
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading Stock OUT ledger...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispatch ID</th>
                <th>Date & Time</th>
                <th>Material</th>
                <th>Godown</th>
                <th>Quantity Dispatched</th>
                <th>Stock (Before ➔ After)</th>
                <th>Customer / Reason</th>
                <th>Invoice / Ref</th>
                <th>Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    No Stock OUT dispatches recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className="badge badge-danger">{tx.transaction_id}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <button
                        type="button"
                        className="table-link"
                        onClick={() => onSelectMaterial && onSelectMaterial(tx.material_id)}
                      >
                        {tx.material_name}
                      </button>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{tx.material_sku}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.godown_name}</td>
                    <td style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f43f5e' }}>
                      -{tx.quantity} {tx.material_unit}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {tx.previous_stock} ➔ <strong style={{ color: '#f43f5e' }}>{tx.new_stock}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.partner_name || 'Direct Sale'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.reason || ''}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{tx.reference_no || 'N/A'}</span>
                    </td>
                    <td>{tx.user_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
