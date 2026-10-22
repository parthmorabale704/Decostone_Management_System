import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { CategoryModal } from '../components/CategoryModal';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search
} from 'lucide-react';

export function Categories({ onSelectCategory, onRefreshGlobalData }) {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [replacementName, setReplacementName] = useState('');
  const [replacementDescription, setReplacementDescription] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCategories = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getCategories();
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openDeleteDialog = (category) => {
    setCategoryToDelete(category);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    if (deleteHasStock) {
      error('Move or dispatch all stock before deleting this category.');
      return;
    }
    setDeleting(true);
    try {
      const result = await api.deleteCategory(categoryToDelete.id);
      success(result.message || `Category "${categoryToDelete.name}" deleted successfully.`);
      setCategoryToDelete(null);
      await fetchCategories(true);
      await onRefreshGlobalData?.();
    } catch (err) {
      error(err.message || 'Failed to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkAdd = async (event) => {
    event.preventDefault();
    const names = bulkNames.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    if (!names.length) {
      error('Enter one or more category names, one per line.');
      return;
    }
    setBulkSubmitting(true);
    try {
      const result = await api.createCategoriesBulk(names);
      success(result.message || 'Categories added.');
      setBulkNames('');
      setBulkAddOpen(false);
      await fetchCategories();
    } catch (err) {
      error(err.message || 'Failed to add categories.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleReplaceAll = async (event) => {
    event.preventDefault();
    setBulkSubmitting(true);
    try {
      const result = await api.replaceAllCategories({ name: replacementName, description: replacementDescription });
      success(result.message || 'Categories replaced.');
      setReplacementName('');
      setReplacementDescription('');
      setResetOpen(false);
      await fetchCategories();
      await onRefreshGlobalData?.();
    } catch (err) {
      error(err.message || 'Failed to replace categories.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );
  const deleteMaterialRecordCount = Number(categoryToDelete?.total_material_records || 0);
  const deleteActiveMaterialCount = Number(categoryToDelete?.total_materials || 0);
  const deleteStockUnits = Number(categoryToDelete?.total_stock_quantity || 0);
  const deleteLotStockUnits = Number(categoryToDelete?.total_lot_quantity || 0);
  const deleteHasStock = deleteStockUnits !== 0 || deleteLotStockUnits !== 0;

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Material Categories</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Stone, marble, tiles, and bathroom ware product classifications
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {user?.role === 'admin' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setBulkAddOpen(true)}
              >
                <Plus size={16} /> Add Multiple
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedCategory(null);
                  setModalOpen(true);
                }}
              >
                <Plus size={16} /> Add Category
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setResetOpen(true)}
                disabled={categories.length === 0}
              >
                <Trash2 size={16} /> Replace All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading categories...
        </div>
      ) : (
        filteredCategories.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <Layers size={36} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
            <h2>{categories.length === 0 ? 'No categories yet' : 'No matching categories'}</h2>
            <p className="text-muted" style={{ marginTop: '8px' }}>
              {categories.length === 0 ? 'Add a category to organize your materials.' : 'Try a different search term.'}
            </p>
            {categories.length === 0 && user?.role === 'admin' && (
              <button className="btn btn-primary" style={{ margin: '18px auto 0' }} onClick={() => { setSelectedCategory(null); setModalOpen(true); }}>
                <Plus size={16} /> Add Category
              </button>
            )}
          </div>
        ) : (
        <div className="grid-cols-3">
          {filteredCategories.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0
              }}
            >
              {/* Image Banner */}
              <div
                style={{
                  height: '140px',
                  background: 'var(--bg-subtle)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-dim)'
                    }}
                  >
                    <Layers size={40} opacity={0.3} />
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(18, 24, 36, 0.9) 0%, transparent 70%)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '16px',
                    right: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{c.name}</h3>
                  <span className="badge badge-info">{c.total_materials} items</span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '16px' }}>
                  {c.description || 'Custom DecoStone material collection'}
                </p>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Stock in Warehouses</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {c.total_stock_quantity?.toLocaleString()} Units
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onSelectCategory && onSelectCategory(c.id)}
                    >
                      View Items ➔
                    </button>
                  </div>

                  {/* Admin Actions */}
                  {user?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectedCategory(c);
                          setModalOpen(true);
                        }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => openDeleteDialog(c)}
                        aria-label={`Delete ${c.name}`}
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={selectedCategory}
        onSuccess={async () => {
          await fetchCategories();
          await onRefreshGlobalData?.();
        }}
      />

      {bulkAddOpen && (
        <div className="modal-overlay" onClick={() => !bulkSubmitting && setBulkAddOpen(false)}>
          <section className="modal-container" role="dialog" aria-modal="true" aria-labelledby="bulk-category-title" style={{ maxWidth: '520px' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="bulk-category-title">Add multiple categories</h2>
                <p className="text-muted">Enter one category name per line. Existing names are skipped.</p>
              </div>
            </div>
            <form onSubmit={handleBulkAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="bulk-category-names">Category names</label>
                  <textarea
                    id="bulk-category-names"
                    className="form-control"
                    rows={7}
                    maxLength={13000}
                    placeholder={'Tiles\nMarble & Granite\nBathroom Ware'}
                    value={bulkNames}
                    onChange={(event) => setBulkNames(event.target.value)}
                    required
                  />
                  <small className="text-muted">Up to 100 names per submission.</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBulkAddOpen(false)} disabled={bulkSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={bulkSubmitting}>{bulkSubmitting ? 'Adding…' : 'Add categories'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {resetOpen && (
        <div className="modal-overlay" onClick={() => !bulkSubmitting && setResetOpen(false)}>
          <section className="modal-container" role="dialog" aria-modal="true" aria-labelledby="replace-categories-title" style={{ maxWidth: '520px' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="replace-categories-title">Replace all existing categories</h2>
                <p className="text-muted">This removes the current categories and creates one new replacement category.</p>
              </div>
            </div>
            <form onSubmit={handleReplaceAll}>
              <div className="modal-body">
                <div className="notice notice-warning" role="note" style={{ marginBottom: '16px' }}>
                  All material records, including archived ones, will be moved to the replacement category. Stock and transaction records are preserved, but category-based reports will use the new category.
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="replacement-category-name">New category name *</label>
                  <input id="replacement-category-name" className="form-control" value={replacementName} onChange={(event) => setReplacementName(event.target.value)} maxLength={120} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="replacement-category-description">Description</label>
                  <textarea id="replacement-category-description" className="form-control" value={replacementDescription} onChange={(event) => setReplacementDescription(event.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetOpen(false)} disabled={bulkSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={bulkSubmitting}>{bulkSubmitting ? 'Replacing…' : 'Replace categories'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {categoryToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setCategoryToDelete(null)}>
          <section
            className="modal-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            style={{ maxWidth: '480px' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="delete-category-title">Delete “{categoryToDelete.name}”?</h2>
                <p className="text-muted">
                  {deleteActiveMaterialCount > 0
                    ? `${deleteActiveMaterialCount} active material(s) use this category. If stock is zero, these records will be archived and their transaction history preserved.`
                    : deleteMaterialRecordCount > 0
                      ? 'This category has no active materials. Archived material and transaction history will be retained.'
                      : 'This category has no materials and can be deleted.'}
                </p>
              </div>
            </div>
            <div className="modal-body">
              {deleteHasStock ? (
                <div className="notice notice-warning" role="alert">
                  This category still has stock and cannot be deleted yet. Clear both warehouse balances ({deleteStockUnits.toLocaleString()} units) and tracked lots ({deleteLotStockUnits.toLocaleString()} units) first.
                </div>
              ) : deleteMaterialRecordCount > 0 ? (
                <p className="text-muted">
                  {deleteActiveMaterialCount > 0
                    ? `No stock remains. ${deleteActiveMaterialCount} zero-stock material(s) will be archived; their transaction history will be preserved.`
                    : 'No active material or stock remains. Archived material and transaction history will be retained.'}
                </p>
              ) : (
                <p className="text-muted">This category has no materials or stock and is safe to delete.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCategoryToDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting || deleteHasStock}
              >
                {deleting ? 'Deleting…' : deleteMaterialRecordCount > 0 ? 'Archive materials and delete' : 'Delete category'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
