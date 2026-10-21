import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { StockBadge } from './StockBadge';
import {
  X,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Warehouse,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';

export function MaterialDetailModal({
  materialId,
  isOpen,
  onClose,
  onQuickAction
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMaterialDetail = async (id, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getMaterial(id);
      if (res.success) setData(res.material);
    } catch (err) {
      console.error('Failed to load material detail:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && materialId) {
      loadMaterialDetail(materialId);
    }
  }, [isOpen, materialId]);

  useStockSync(() => {
    if (isOpen && materialId) {
      loadMaterialDetail(materialId, true);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              <Package size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{data?.name || 'Loading...'}</h3>
                {data && (
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px', color: 'var(--primary)', fontWeight: 700 }}>
                    {data.sku}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {data?.category_name} • Brand: {data?.brand || 'DecoStone'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onClose} className="btn-icon">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
              Loading material details and stock ledger...
            </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Top Overview: Image + Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: data.image_url ? '220px 1fr' : '1fr', gap: '20px' }}>
                {data.image_url && (
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      height: '200px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <img
                      src={data.image_url}
                      alt={data.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="grid-cols-3">
                    <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Available Stock</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                        {data.total_stock} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{data.unit}</span>
                      </div>
                      <StockBadge status={data.total_stock <= data.min_stock_level ? 'LOW_STOCK' : 'IN_STOCK'} quantity={data.total_stock} minStock={data.min_stock_level} />
                    </div>

                    <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purchase / Cost</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        ₹{Number(data.purchase_price).toLocaleString()}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Selling: ₹{Number(data.selling_price).toLocaleString()}</span>
                    </div>

                    <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min Safety Level</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        {data.min_stock_level} {data.unit}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Threshold Alert</span>
                    </div>
                  </div>

                  {/* Attributes Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {data.size && (
                      <span style={{ background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Size:</strong> {data.size}
                      </span>
                    )}
                    {data.color && (
                      <span style={{ background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Color/Finish:</strong> {data.color}
                      </span>
                    )}
                    {data.unit && (
                      <span style={{ background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Unit of Measure:</strong> {data.unit}
                      </span>
                    )}
                  </div>

                  {data.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {data.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Godown-wise Stock Breakdown Table */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Warehouse size={16} color="var(--primary)" /> Godown Inventory Breakdown
                </h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Warehouse</th>
                        <th>Code</th>
                        <th>Available Stock</th>
                        <th>Status</th>
                        <th>Quick Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.godownsStock?.map((g) => (
                        <tr key={g.godown_id}>
                          <td style={{ fontWeight: 600 }}>{g.godown_name}</td>
                          <td><span className="badge badge-info">{g.godown_code || 'GDN'}</span></td>
                          <td style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                            {g.quantity} {data.unit}
                          </td>
                          <td>
                            <StockBadge status={g.stock_status} quantity={g.quantity} minStock={data.min_stock_level} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => {
                                  onClose();
                                  onQuickAction('STOCK_IN', data.id, g.godown_id);
                                }}
                              >
                                + IN
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                disabled={g.quantity <= 0}
                                onClick={() => {
                                  onClose();
                                  onQuickAction('STOCK_OUT', data.id, g.godown_id);
                                }}
                              >
                                - OUT
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                disabled={g.quantity <= 0}
                                onClick={() => {
                                  onClose();
                                  onQuickAction('TRANSFER', data.id, g.godown_id);
                                }}
                              >
                                ⇄ Transfer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Movement History */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--primary)" /> Stock Movement Ledger (Audit Trail)
                </h4>
                <div className="table-responsive" style={{ maxHeight: '220px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Transaction Type</th>
                        <th>Godown</th>
                        <th>Quantity</th>
                        <th>Prev ➔ New Stock</th>
                        <th>Recorded By</th>
                        <th>Ref / Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.movementHistory?.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                            No stock movement transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        data.movementHistory?.map((tx) => {
                          let typeBadge = 'badge-info';
                          if (tx.transaction_type === 'STOCK_IN' || tx.transaction_type === 'TRANSFER_IN' || tx.transaction_type === 'OPENING_STOCK') {
                            typeBadge = 'badge-success';
                          } else if (tx.transaction_type === 'STOCK_OUT' || tx.transaction_type === 'TRANSFER_OUT') {
                            typeBadge = 'badge-danger';
                          } else if (tx.transaction_type === 'ADJUSTMENT') {
                            typeBadge = 'badge-warning';
                          }

                          return (
                            <tr key={tx.id}>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(tx.created_at).toLocaleString()}
                              </td>
                              <td>
                                <span className={`badge ${typeBadge}`}>
                                  {tx.transaction_type.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{tx.godown_name}</td>
                              <td style={{ fontWeight: 700 }}>{tx.quantity} {data.unit}</td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                                {tx.previous_stock} ➔ <strong style={{ color: 'var(--text-main)' }}>{tx.new_stock}</strong>
                              </td>
                              <td>{tx.user_name}</td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {tx.reference_no ? `[${tx.reference_no}] ` : ''}{tx.reason || '-'}
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
          ) : null}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
