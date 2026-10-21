import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockSync } from '../hooks/useStockSync';
import { Sliders, Plus, RefreshCw, AlertTriangle, FileCheck } from 'lucide-react';

export function Adjustments({ onOpenTransactionModal, onSelectMaterial }) {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 100;

  const loadAdjustments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getAdjustments({ limit: pageSize, offset });
      if (res.success) {
        setAdjustments(res.adjustments || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load adjustments:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustments();
  }, [offset]);

  useStockSync(() => {
    loadAdjustments(true);
  });

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
            <Sliders size={28} color="#06b6d4" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Stock Adjustments & Physical Audit</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Reconcile physical warehouse stock counts against database records with mandatory audit justification
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadAdjustments}>
            <RefreshCw size={14} /> Refresh
          </button>
          {(user?.role === 'admin' || user?.can_adjust) && (
            <button
              className="btn btn-primary"
              onClick={() => onOpenTransactionModal && onOpenTransactionModal('ADJUSTMENT')}
            >
              <Plus size={16} /> + New Physical Adjustment
            </button>
          )}
        </div>
      </div>

      {/* Adjustments Ledger */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading adjustment ledger...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit Date</th>
                <th>Warehouse</th>
                <th>Material</th>
                <th>System Stock</th>
                <th>Physical Count</th>
                <th>Variance (Diff)</th>
                <th>Reason / Justification</th>
                <th>Audited By</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    No physical stock adjustments recorded.
                  </td>
                </tr>
              ) : (
                adjustments.map((a) => {
                  const isPositive = a.adjustment_quantity >= 0;
                  return (
                    <tr key={a.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{a.godown_name}</td>
                      <td style={{ fontWeight: 600 }}>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => onSelectMaterial && onSelectMaterial(a.material_id)}
                        >
                          {a.material_name}
                        </button>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{a.material_sku}</span>
                      </td>
                      <td>{a.system_stock} {a.material_unit}</td>
                      <td style={{ fontWeight: 700 }}>{a.physical_stock} {a.material_unit}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            color: isPositive ? '#34d399' : '#fb7185',
                            border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                          }}
                        >
                          {isPositive ? `+${a.adjustment_quantity}` : a.adjustment_quantity} {a.material_unit}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {a.reason}
                      </td>
                      <td>{a.user_name}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination-controls"><span>Showing {total ? offset + 1 : 0}–{Math.min(offset + adjustments.length, total)} of {total} adjustments</span><div><button className="btn btn-secondary btn-sm" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</button><button className="btn btn-secondary btn-sm" disabled={offset + pageSize >= total || loading} onClick={() => setOffset(offset + pageSize)}>Next</button></div></div>
    </div>
  );
}
