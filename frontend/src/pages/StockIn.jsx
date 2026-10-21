import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useStockSync } from '../hooks/useStockSync';
import { ArrowDownLeft, Plus, RefreshCw, Calendar, FileText, User } from 'lucide-react';

export function StockIn({ onOpenTransactionModal, onSelectMaterial }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStockInHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getTransactions({ type: 'STOCK_IN', limit: 100 });
      if (res.success) {
        setTransactions(res.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load stock IN receipts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadStockInHistory();
  }, []);

  useStockSync(() => {
    loadStockInHistory(true);
  });

  const totalInQty = transactions.reduce((acc, tx) => acc + tx.quantity, 0);

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
            <ArrowDownLeft size={28} color="#10b981" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Stock IN Receipts</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Receive goods, update godown stocks, record purchase invoices & supplier shipments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadStockInHistory}>
            <RefreshCw size={14} /> Refresh
          </button>
          {user?.can_stock_in && (
            <button
              className="btn btn-success"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN')}
            >
              <Plus size={16} /> + New Stock IN
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Inflow Logged</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
            {totalInQty.toLocaleString()} Units Received
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Shipments</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {transactions.length} Receipts
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading Stock IN receipts...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt ID</th>
                <th>Date & Time</th>
                <th>Material</th>
                <th>Godown</th>
                <th>Quantity Received</th>
                <th>Stock (Before ➔ After)</th>
                <th>Supplier / PO Ref</th>
                <th>Received By</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    No Stock IN transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className="badge badge-info">{tx.transaction_id}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div
                        style={{ cursor: 'pointer', color: 'var(--primary)' }}
                        onClick={() => onSelectMaterial && onSelectMaterial(tx.material_id)}
                      >
                        {tx.material_name}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{tx.material_sku}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.godown_name}</td>
                    <td style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                      +{tx.quantity} {tx.material_unit}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {tx.previous_stock} ➔ <strong style={{ color: '#10b981' }}>{tx.new_stock}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.partner_name || 'Direct Factory'}</div>
                      {tx.reference_no && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>PO: {tx.reference_no}</div>
                      )}
                    </td>
                    <td>{tx.user_name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.reason || '-'}</td>
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
