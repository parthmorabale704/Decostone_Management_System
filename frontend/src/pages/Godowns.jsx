import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { StockBadge } from '../components/StockBadge';
import {
  Warehouse,
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Filter,
  Edit2,
  Check,
  X,
  RefreshCw,
  Plus
} from 'lucide-react';

export function Godowns({ godownId = null, onOpenTransactionModal, onSelectMaterial }) {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [godowns, setGodowns] = useState([]);
  const [selectedGodownId, setSelectedGodownId] = useState(godownId);
  const [godownDetail, setGodownDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Editing godown state (Admin only)
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (godownId) {
      setSelectedGodownId(godownId);
    }
  }, [godownId]);

  const loadGodowns = async () => {
    try {
      const res = await api.getGodowns();
      if (res.success) {
        setGodowns(res.godowns || []);
        if (!selectedGodownId && res.godowns?.length > 0) {
          setSelectedGodownId(res.godowns[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load godowns:', err);
    }
  };

  const loadGodownDetail = async (id, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getGodown(id);
      if (res.success) {
        setGodownDetail(res);
        setEditName(res.godown.name);
        setEditLocation(res.godown.location || '');
        setEditDescription(res.godown.description || '');
      }
    } catch (err) {
      console.error('Failed to load godown detail:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadGodowns();
  }, []);

  useEffect(() => {
    if (selectedGodownId) {
      loadGodownDetail(selectedGodownId);
    }
  }, [selectedGodownId]);

  useStockSync(() => {
    loadGodowns();
    if (selectedGodownId) {
      loadGodownDetail(selectedGodownId, true);
    }
  });

  const handleUpdateGodown = async (e) => {
    e.preventDefault();
    try {
      await api.updateGodown(selectedGodownId, {
        name: editName,
        location: editLocation,
        description: editDescription
      });
      success('Godown details updated successfully.');
      setIsEditing(false);
      loadGodowns();
      loadGodownDetail(selectedGodownId);
    } catch (err) {
      error(err.message || 'Failed to update godown.');
    }
  };

  const inventory = godownDetail?.inventory || [];
  const filteredInventory = inventory.filter((item) => {
    const matchSearch =
      !search ||
      item.material_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

    const matchCat = !categoryFilter || String(item.category_id) === String(categoryFilter);
    const matchStatus = !statusFilter || item.stock_status === statusFilter;

    return matchSearch && matchCat && matchStatus;
  });

  const categories = Array.from(
    new Map(inventory.map((item) => [item.category_id, item.category_name])).entries()
  );

  return (
    <div className="page-wrapper">
      {/* Top Warehouse Tabs Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {godowns.map((g) => (
            <button
              key={g.id}
              className={`btn ${selectedGodownId === g.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedGodownId(g.id)}
              style={{ fontSize: '0.9rem' }}
            >
              <Warehouse size={16} />
              <span>{g.name}</span>
              <span
                style={{
                  background: selectedGodownId === g.id ? 'rgba(0,0,0,0.2)' : 'var(--bg-subtle)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {g.total_stock_qty}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-success btn-sm"
            onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN', null, selectedGodownId)}
          >
            <ArrowDownLeft size={15} /> + Stock IN
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenTransactionModal && onOpenTransactionModal('TRANSFER', null, selectedGodownId)}
          >
            <ArrowRightLeft size={15} /> Transfer Material
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading warehouse ledger...
        </div>
      ) : godownDetail ? (
        <div>
          {/* Warehouse Header Card */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                {isEditing ? (
                  <form onSubmit={handleUpdateGodown} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Warehouse Name"
                        required
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location"
                      />
                    </div>
                    <textarea
                      className="form-control"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Warehouse Description"
                      rows={2}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-sm btn-success">
                        <Check size={14} /> Save Changes
                      </button>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setIsEditing(false)}>
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{godownDetail.godown.name}</h2>
                      <span className="badge badge-info">{godownDetail.godown.code || 'GDN'}</span>
                      {user?.role === 'admin' && (
                        <button
                          className="btn-icon"
                          onClick={() => setIsEditing(true)}
                          title="Edit Godown Details"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {godownDetail.godown.location || 'Central Facility'} • {godownDetail.godown.description || 'Primary Storage Facility'}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Warehouse Stats */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Stock</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {godownDetail.stats.totalQuantity.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active SKUs</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {godownDetail.stats.totalMaterials}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Low Stock</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: godownDetail.stats.lowStockCount > 0 ? '#f43f5e' : '#10b981' }}>
                    {godownDetail.stats.lowStockCount}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valuation</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{godownDetail.stats.inventoryValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', maxWidth: '600px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Search materials, SKU code, brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="form-control"
                style={{ width: '180px' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                className="form-control"
                style={{ width: '150px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Showing <strong>{filteredInventory.length}</strong> items in {godownDetail.godown.name}
            </div>
          </div>

          {/* Inventory Table (FR-12 Format) */}
          <div className="table-responsive" style={{ marginBottom: '24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Warehouse Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                      No materials found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.material_id}>
                      <td style={{ fontWeight: 600 }}>
                        <div
                          style={{ cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onClick={() => onSelectMaterial && onSelectMaterial(item.material_id)}
                        >
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt=""
                              style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                          )}
                          <span>{item.material_name}</span>
                        </div>
                        {item.brand && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>
                            {item.brand} {item.size ? `• ${item.size}` : ''}
                          </span>
                        )}
                      </td>
                      <td>{item.category_name}</td>
                      <td>
                        <span className="badge badge-info">{item.sku}</span>
                      </td>
                      <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                        {item.quantity}
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.min_stock_level}</td>
                      <td>
                        <StockBadge
                          status={item.stock_status}
                          quantity={item.quantity}
                          minStock={item.min_stock_level}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN', item.material_id, selectedGodownId)}
                            title="Stock IN"
                          >
                            + IN
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={item.quantity <= 0}
                            onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_OUT', item.material_id, selectedGodownId)}
                            title="Stock OUT"
                          >
                            - OUT
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={item.quantity <= 0}
                            onClick={() => onOpenTransactionModal && onOpenTransactionModal('TRANSFER', item.material_id, selectedGodownId)}
                            title="Transfer"
                          >
                            ⇄ Transfer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Godown Transactions */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>
              Recent Transactions in {godownDetail.godown.name}
            </h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Previous ➔ New</th>
                    <th>User</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {godownDetail.recentTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                        No transactions recorded for this warehouse yet.
                      </td>
                    </tr>
                  ) : (
                    godownDetail.recentTransactions?.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              tx.transaction_type.includes('IN')
                                ? 'badge-success'
                                : tx.transaction_type.includes('OUT')
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {tx.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{tx.material_name}</td>
                        <td style={{ fontWeight: 700 }}>{tx.quantity}</td>
                        <td>{tx.previous_stock} ➔ {tx.new_stock}</td>
                        <td>{tx.user_name}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          {tx.reference_no || tx.reason || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
