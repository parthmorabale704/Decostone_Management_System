import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockSync } from '../hooks/useStockSync';
import { ArrowRightLeft, Plus, RefreshCw, Warehouse, ShieldCheck } from 'lucide-react';

export function Transfers({ onOpenTransactionModal, onSelectMaterial }) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransfers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getTransfers();
      if (res.success) {
        setTransfers(res.transfers || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  useStockSync(() => {
    loadTransfers(true);
  });

  const totalTransferredQty = transfers.reduce((acc, t) => acc + t.quantity, 0);

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
            <ArrowRightLeft size={28} color="#f59e0b" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Warehouse Material Transfers</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Atomic inter-godown transfers with guaranteed zero-loss total company stock integrity
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadTransfers}>
            <RefreshCw size={14} /> Refresh
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              className="btn btn-primary"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('TRANSFER')}
            >
              <Plus size={16} /> + New Transfer
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Inter-Warehouse Movement</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            {totalTransferredQty.toLocaleString()} Units Relocated
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
          <ShieldCheck size={20} />
          <span>ACID Transaction Safeguard Active</span>
        </div>
      </div>

      {/* Transfers Ledger */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading material transfers...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Date & Time</th>
                <th>Source Warehouse (From)</th>
                <th>Destination Warehouse (To)</th>
                <th>Material</th>
                <th>Transferred Quantity</th>
                <th>Reason / Notes</th>
                <th>Status</th>
                <th>Transferred By</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    No material transfers logged yet.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="badge badge-primary">{t.transfer_id}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f43f5e' }}>
                      {t.from_godown_name}
                    </td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>
                      {t.to_godown_name}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div
                        style={{ cursor: 'pointer', color: 'var(--primary)' }}
                        onClick={() => onSelectMaterial && onSelectMaterial(t.material_id)}
                      >
                        {t.material_name}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{t.material_sku}</span>
                    </td>
                    <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      {t.quantity} {t.material_unit}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {t.reason || 'Inventory balancing'}
                    </td>
                    <td>
                      <span className="badge badge-success">{t.status || 'COMPLETED'}</span>
                    </td>
                    <td>{t.user_name}</td>
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
