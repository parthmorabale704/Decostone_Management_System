import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { emitStockUpdated } from '../utils/stockEvents';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export function TransactionModal({
  isOpen,
  onClose,
  initialType = 'STOCK_IN',
  initialMaterialId = null,
  initialGodownId = null,
  godowns = [],
  materials = [],
  onGoToMaterials,
  onSuccess
}) {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [type, setType] = useState(initialType);
  const [materialId, setMaterialId] = useState(initialMaterialId || '');
  const preferredAssignedGodown = user?.assigned_godown_ids?.[0] || user?.assigned_godown_id || '';
  const [godownId, setGodownId] = useState(initialGodownId || preferredAssignedGodown);
  const [toGodownId, setToGodownId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [physicalStock, setPhysicalStock] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Set default state when props change
  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    setMaterialId(initialMaterialId ?? '');
    setGodownId(initialGodownId ?? user?.assigned_godown_ids?.[0] ?? user?.assigned_godown_id ?? '');
    setToGodownId('');
    setQuantity('');
    setPhysicalStock('');
    setReferenceNo('');
    setPartnerName('');
    setRemarks('');
  }, [isOpen, initialType, initialMaterialId, initialGodownId, user?.assigned_godown_id, user?.assigned_godown_ids]);

  useEffect(() => {
    if (!isOpen || godowns.length === 0) return;
    const currentSourceIsValid = godowns.some(g => String(g.id) === String(godownId));
    const preferredSource = initialGodownId ?? user?.assigned_godown_ids?.[0] ?? user?.assigned_godown_id;
    const sourceId = currentSourceIsValid
      ? godownId
      : godowns.some(g => String(g.id) === String(preferredSource))
        ? preferredSource
        : godowns[0].id;

    if (!currentSourceIsValid) setGodownId(sourceId);

    const destinationIsValid = godowns.some(g =>
      String(g.id) === String(toGodownId) && String(g.id) !== String(sourceId)
    );
    if (!destinationIsValid) {
      setToGodownId(godowns.find(g => String(g.id) !== String(sourceId))?.id ?? '');
    }
  }, [isOpen, godowns, godownId, toGodownId, initialGodownId, user?.assigned_godown_id, user?.assigned_godown_ids]);

  if (!isOpen) return null;

  // Find selected material & godown info for live stock display
  const selectedMaterial = materials.find((m) => String(m.id) === String(materialId));
  const currentStockObj = selectedMaterial?.godown_stocks?.find((gs) => String(gs.godown_id) === String(godownId));
  const currentStock = currentStockObj ? Number(currentStockObj.quantity) : 0;

  // For transfer: target godown stock
  const targetStockObj = selectedMaterial?.godown_stocks?.find((gs) => String(gs.godown_id) === String(toGodownId));
  const targetStock = targetStockObj ? Number(targetStockObj.quantity) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let resultData = null;
      if (type === 'STOCK_IN') {
        const res = await api.stockIn({
          godownId,
          materialId,
          quantity: Number(quantity),
          supplier: partnerName,
          referenceNo,
          remarks
        });
        resultData = res.data;
        success(res.message || 'Stock IN recorded successfully!');
      } else if (type === 'STOCK_OUT') {
        const res = await api.stockOut({
          godownId,
          materialId,
          quantity: Number(quantity),
          customer: partnerName,
          referenceNo,
          remarks
        });
        resultData = res.data;
        success(res.message || 'Stock OUT recorded successfully!');
      } else if (type === 'TRANSFER') {
        const res = await api.transfer({
          fromGodownId: godownId,
          toGodownId,
          materialId,
          quantity: Number(quantity),
          reason: remarks
        });
        resultData = res.data;
        success(res.message || 'Transfer completed successfully!');
      } else if (type === 'ADJUSTMENT') {
        const res = await api.adjust({
          godownId,
          materialId,
          physicalStock: Number(physicalStock),
          reason: remarks
        });
        resultData = res.data;
        success(res.message || 'Stock adjustment saved!');
      }

      if (resultData) {
        emitStockUpdated(resultData);
      }

      if (onSuccess) onSuccess(resultData);
      onClose();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {type === 'STOCK_IN' && <ArrowDownLeft size={22} color="#10b981" />}
            {type === 'STOCK_OUT' && <ArrowUpRight size={22} color="#f43f5e" />}
            {type === 'TRANSFER' && <ArrowRightLeft size={22} color="#f59e0b" />}
            {type === 'ADJUSTMENT' && <Sliders size={22} color="#06b6d4" />}
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {type === 'STOCK_IN' && 'Record Stock IN (Receipt)'}
                {type === 'STOCK_OUT' && 'Record Stock OUT (Dispatch)'}
                {type === 'TRANSFER' && 'Material Inter-Warehouse Transfer'}
                {type === 'ADJUSTMENT' && 'Physical Stock Adjustment'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                DecoStone Transaction Safeguard & Audit Enabled
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Transaction Type Tabs */}
            <div
              className="transaction-type-tabs"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '20px',
                background: 'var(--bg-input)',
                padding: '4px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {(user?.role === 'admin' || user?.can_stock_in) && (
                <button
                  type="button"
                  onClick={() => setType('STOCK_IN')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: type === 'STOCK_IN' ? 'rgba(16, 185, 129, 0.2)' : 'none',
                    color: type === 'STOCK_IN' ? '#10b981' : 'var(--text-muted)',
                    fontWeight: type === 'STOCK_IN' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Stock IN
                </button>
              )}

              {(user?.role === 'admin' || user?.can_stock_out) && (
                <button
                  type="button"
                  onClick={() => setType('STOCK_OUT')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: type === 'STOCK_OUT' ? 'rgba(244, 63, 94, 0.2)' : 'none',
                    color: type === 'STOCK_OUT' ? '#f43f5e' : 'var(--text-muted)',
                    fontWeight: type === 'STOCK_OUT' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Stock OUT
                </button>
              )}

              {(user?.role === 'admin' || user?.role === 'manager') && (
                <button
                  type="button"
                  onClick={() => setType('TRANSFER')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: type === 'TRANSFER' ? 'rgba(245, 158, 11, 0.2)' : 'none',
                    color: type === 'TRANSFER' ? '#f59e0b' : 'var(--text-muted)',
                    fontWeight: type === 'TRANSFER' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Transfer
                </button>
              )}

              {(user?.role === 'admin' || user?.can_adjust) && (
                <button
                  type="button"
                  onClick={() => setType('ADJUSTMENT')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: type === 'ADJUSTMENT' ? 'rgba(6, 182, 212, 0.2)' : 'none',
                    color: type === 'ADJUSTMENT' ? '#06b6d4' : 'var(--text-muted)',
                    fontWeight: type === 'ADJUSTMENT' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Adjust
                </button>
              )}
            </div>

            {/* Material Selector */}
            <div className="form-group">
              <label className="form-label">Material *</label>
              <select
                className="form-control"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                required
              >
                <option value="">-- Select Material --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.sku}) - {m.category_name} [{m.unit}]
                  </option>
                ))}
              </select>
            </div>
            {materials.length === 0 && (
              <div className="notice notice-warning" role="note">
                Create a category and material before recording stock.
                {onGoToMaterials && (
                  <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: '10px' }} onClick={onGoToMaterials}>
                    Go to materials
                  </button>
                )}
              </div>
            )}

            {/* Warehouse Selectors */}
            {type === 'TRANSFER' ? (
              <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">From Godown (Source) *</label>
                  <select
                    className="form-control"
                    value={godownId}
                    onChange={(e) => setGodownId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Source --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id} disabled={String(g.id) === String(toGodownId)}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">To Godown (Destination) *</label>
                  <select
                    className="form-control"
                    value={toGodownId}
                    onChange={(e) => setToGodownId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Destination --</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id} disabled={String(g.id) === String(godownId)}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Godown / Warehouse *</label>
                <select
                  className="form-control"
                  value={godownId}
                  onChange={(e) => setGodownId(e.target.value)}
                  disabled={Boolean(user?.role === 'supervisor' && (user?.assigned_godown_ids || []).length === 1)}
                  required
                >
                  <option value="">-- Select Warehouse --</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code || 'Main'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Stock Status Indicator */}
            {selectedMaterial && godownId && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Current Available in Selected Warehouse
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: currentStock === 0 ? '#f43f5e' : '#10b981' }}>
                    {currentStock} {selectedMaterial.unit}
                  </div>
                </div>

                {type === 'STOCK_OUT' && quantity && Number(quantity) > currentStock && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e', fontSize: '0.8rem', fontWeight: 700 }}>
                    <AlertTriangle size={16} />
                    <span>Insufficient stock!</span>
                  </div>
                )}

                {type === 'TRANSFER' && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Dest. Warehouse Stock
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {targetStock} {selectedMaterial.unit}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity or Physical Stock Input */}
            {type === 'ADJUSTMENT' ? (
              <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">System Recorded Stock</label>
                  <input
                    type="text"
                    className="form-control"
                    value={`${currentStock} ${selectedMaterial?.unit || ''}`}
                    disabled
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Physical Count *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-control"
                    placeholder="Enter verified physical count"
                    value={physicalStock}
                    onChange={(e) => setPhysicalStock(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Quantity ({selectedMaterial?.unit || 'Units'}) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="form-control"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            )}

            {/* References & Partner Details */}
            {type === 'STOCK_IN' && (
              <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Supplier / Source</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Carrara Quarry / Deco Imports"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Purchase / Ref No.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. PO-2026-901"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {type === 'STOCK_OUT' && (
              <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Customer / Reason</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Villa Project / Retail Customer"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Invoice / Ref No.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. INV-2026-440"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Remarks / Reason */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {type === 'ADJUSTMENT' ? 'Adjustment Reason *' : 'Remarks / Notes'}
              </label>
              <textarea
                className="form-control"
                placeholder={
                  type === 'ADJUSTMENT'
                    ? 'Explain reason for variance (e.g. Broken tiles during unloading, audit recount discrepancy)'
                    : 'Additional notes or dispatch tracking'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required={type === 'ADJUSTMENT'}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${
                type === 'STOCK_IN'
                  ? 'btn-success'
                  : type === 'STOCK_OUT'
                  ? 'btn-danger'
                  : 'btn-primary'
              }`}
              disabled={
                submitting ||
                materials.length === 0 ||
                (type === 'STOCK_OUT' && quantity && Number(quantity) > currentStock) ||
                (type === 'TRANSFER' && quantity && Number(quantity) > currentStock)
              }
            >
              {submitting ? 'Processing...' : 'Confirm Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
