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
  Boxes,
  Package,
  RefreshCw,
  Search
} from 'lucide-react';

export function Categories({ onSelectCategory }) {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;

    try {
      await api.deleteCategory(id);
      success(`Category "${name}" deleted successfully.`);
      fetchCategories();
    } catch (err) {
      error(err.message || 'Failed to delete category.');
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

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

        <div style={{ display: 'flex', gap: '10px' }}>
          {user?.role === 'admin' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedCategory(null);
                setModalOpen(true);
              }}
            >
              <Plus size={16} /> Add Category
            </button>
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
                        onClick={() => handleDelete(c.id, c.name)}
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
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={selectedCategory}
        onSuccess={fetchCategories}
      />
    </div>
  );
}
