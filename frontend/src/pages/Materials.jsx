import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { StockBadge } from '../components/StockBadge';
import { MaterialModal } from '../components/MaterialModal';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Eye,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  Warehouse
} from 'lucide-react';

export function Materials({
  selectedCategoryId = null,
  onOpenTransactionModal,
  onSelectMaterial,
  onSelectPage,
  onRefreshGlobalData
}) {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters & Views
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(selectedCategoryId || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Modals
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [matRes, catRes, gdnRes] = await Promise.all([
        api.getMaterials({
          search,
          category_id: categoryId,
          stock_status: statusFilter,
          brand: brandFilter
        }),
        api.getCategories(),
        api.getGodowns()
      ]);

      if (matRes.success) setMaterials(matRes.materials || []);
      if (catRes.success) setCategories(catRes.categories || []);
      if (gdnRes.success) setGodowns(gdnRes.godowns || []);
      setLoadError('');
    } catch (err) {
      console.error('Failed to load materials data:', err);
      setLoadError(err.message || 'Could not load inventory data. Check the server connection and try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      setCategoryId(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    loadData();
  }, [categoryId, statusFilter, brandFilter]);

  useStockSync(() => {
    loadData(true);
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete material "${name}"? It must have zero stock in every warehouse. Historical transactions will be preserved.`)) return;

    try {
      await api.deleteMaterial(id);
      success(`Material "${name}" soft-deleted.`);
      await loadData(true);
      await onRefreshGlobalData?.();
    } catch (err) {
      error(err.message || 'Failed to delete material.');
    }
  };

  // Extract unique brands for filter
  const brands = Array.from(new Set(materials.map((m) => m.brand).filter(Boolean)));

  return (
    <div className="page-wrapper">
      {/* Header */}
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
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Materials Master Catalog</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Comprehensive inventory of tiles, marble, sanitary ware across all godowns
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            <button
              className="btn-icon"
              style={{
                background: viewMode === 'table' ? 'var(--bg-card)' : 'none',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-dim)'
              }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={18} />
            </button>
            <button
              className="btn-icon"
              style={{
                background: viewMode === 'grid' ? 'var(--bg-card)' : 'none',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-dim)'
              }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          {(user?.role === 'admin' || user?.role === 'manager') && (
            categories.length === 0 ? (
              <button className="btn btn-primary" onClick={() => onSelectPage?.('categories')}>
                <Plus size={16} /> Create a Category First
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingMaterial(null);
                  setMaterialModalOpen(true);
                }}
              >
                <Plus size={16} /> Add Material
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '14px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name, SKU (TIL-001), size, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Category Filter */}
          <select
            className="form-control"
            style={{ width: '160px' }}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            className="form-control"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Stock Status</option>
            <option value="IN_STOCK">🟢 In Stock</option>
            <option value="LOW_STOCK">🟠 Low Stock</option>
            <option value="OUT_OF_STOCK">🔴 Out of Stock</option>
          </select>

          {/* Brand Filter */}
          {brands.length > 0 && (
            <select
              className="form-control"
              style={{ width: '150px' }}
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setCategoryId('');
              setStatusFilter('');
              setBrandFilter('');
              loadData();
            }}
            title="Reset Filters"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading materials database...
        </div>
      ) : loadError ? (
        <div className="card" role="alert" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p style={{ color: 'var(--danger, #b42336)', marginBottom: '16px' }}>{loadError}</p>
          <button type="button" className="btn btn-secondary" onClick={() => loadData()}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : materials.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <Boxes size={48} color="var(--primary)" opacity={0.4} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            {categories.length === 0 ? 'Create a category to get started' : 'No materials found'}
          </h3>
          <p style={{ fontSize: '0.88rem', marginBottom: '20px' }}>
            {categories.length === 0
              ? 'Materials must belong to a category. Create one, then return here to add materials and opening stock.'
              : materials.length === 0 && (search || categoryId || statusFilter || brandFilter)
                ? 'No products match the selected filters or search terms.'
                : 'There are no materials yet. Add a material to begin tracking warehouse stock.'}
          </p>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            categories.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => onSelectPage?.('categories')}>
                <Plus size={16} /> Create Category
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingMaterial(null);
                  setMaterialModalOpen(true);
                }}
              >
                <Plus size={16} /> Add First Material
              </button>
            )
          )}
          {categories.length > 0 && (search || categoryId || statusFilter || brandFilter) && (
            <button type="button" className="btn btn-secondary" style={{ marginLeft: '8px' }} onClick={() => {
              setSearch('');
              setCategoryId('');
              setStatusFilter('');
              setBrandFilter('');
            }}>
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item / SKU</th>
                <th>Category</th>
                <th>Size & Finish</th>
                <th>Price (₹)</th>
                <th>Total Stock</th>
                <th>Godowns Breakdown</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  {/* Item / SKU */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {m.image_url ? (
                        <img
                          src={m.image_url}
                          alt={m.name}
                          style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '6px',
                            background: 'var(--bg-input)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-dim)'
                          }}
                        >
                          <Boxes size={18} />
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => onSelectMaterial && onSelectMaterial(m.id)}
                        >
                          {m.name}
                        </button>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>{m.sku}</span>
                          {m.brand && <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{m.brand}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td>{m.category_name}</td>

                  {/* Size & Color */}
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div>{m.size || '-'}</div>
                    <div style={{ color: 'var(--text-dim)' }}>{m.color || ''}</div>
                  </td>

                  {/* Pricing */}
                  <td>
                    <div style={{ fontWeight: 700 }}>₹{Number(m.selling_price).toLocaleString()}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Cost: ₹{Number(m.purchase_price).toLocaleString()}</div>
                  </td>

                  {/* Total Stock */}
                  <td>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      {m.total_stock} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>{m.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Min: {m.min_stock_level} {m.unit}</div>
                  </td>

                  {/* Godowns Distribution Pill Badges */}
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                      {m.godown_stocks?.map((gs) => (
                        <span
                          key={gs.godown_id}
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: gs.quantity > 0 ? 'var(--bg-input)' : 'rgba(244, 63, 94, 0.08)',
                            color: gs.quantity > 0 ? 'var(--text-main)' : 'var(--text-dim)',
                            border: '1px solid var(--border-color)',
                            display: 'inline-flex',
                            gap: '4px'
                          }}
                        >
                          <strong style={{ color: 'var(--text-muted)' }}>
                            {gs.godown_name?.replace('Godown ', 'G')}:
                          </strong>
                          <span style={{ fontWeight: 700, color: gs.quantity === 0 ? '#f43f5e' : 'var(--primary)' }}>
                            {gs.quantity}
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <StockBadge status={m.stock_status} quantity={m.total_stock} minStock={m.min_stock_level} />
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => onSelectMaterial && onSelectMaterial(m.id)}
                        title="View Full Specification & History"
                      >
                        <Eye size={16} />
                      </button>

                      {user?.can_stock_in && (
                        <button
                          className="btn-icon"
                          style={{ color: '#10b981' }}
                          onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN', m.id)}
                          title="Quick Stock IN"
                        >
                          <ArrowDownLeft size={16} />
                        </button>
                      )}

                      {user?.can_stock_out && (
                        <button
                          className="btn-icon"
                          style={{ color: '#f43f5e' }}
                          disabled={m.total_stock <= 0}
                          onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_OUT', m.id)}
                          title="Quick Stock OUT"
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      )}

                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setEditingMaterial(m);
                            setMaterialModalOpen(true);
                          }}
                          title="Edit Material"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      {user?.role === 'admin' && (
                        <button
                          className="btn-icon"
                          style={{ color: '#f43f5e' }}
                          onClick={() => handleDelete(m.id, m.name)}
                          title="Delete Material"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid-cols-3">
          {materials.map((m) => (
            <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '140px', background: 'var(--bg-input)', position: 'relative' }}>
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                    <Boxes size={40} opacity={0.3} />
                  </div>
                )}
                <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                  <span className="badge badge-info">{m.sku}</span>
                </div>
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <StockBadge status={m.stock_status} />
                </div>
              </div>

              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{m.category_name}</div>
                  <h3 className="material-card-title">
                    <button type="button" className="table-link" onClick={() => onSelectMaterial && onSelectMaterial(m.id)}>
                      {m.name}
                    </button>
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {m.brand} • {m.size || 'Standard'}
                  </div>
                </div>

                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Total Across Warehouses</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {m.total_stock} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{m.unit}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Selling Price</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{Number(m.selling_price).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-sm btn-outline w-full"
                      onClick={() => onSelectMaterial && onSelectMaterial(m.id)}
                    >
                      <Eye size={14} /> Details
                    </button>
                    {user?.can_stock_in && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN', m.id)}
                      >
                        + IN
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Material Modal */}
      <MaterialModal
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        material={editingMaterial}
        categories={categories}
        godowns={godowns}
        onSuccess={async () => {
          await loadData(true);
          await onRefreshGlobalData?.();
        }}
      />
    </div>
  );
}
