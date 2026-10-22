import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { X, PackagePlus, Edit, Image as ImageIcon } from 'lucide-react';

export function MaterialModal({
  isOpen,
  onClose,
  material = null,
  categories = [],
  godowns = [],
  onSuccess
}) {
  const { success, error } = useNotification();
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category_id: '',
    brand: '',
    description: '',
    size: '',
    color: '',
    unit: 'Box',
    purchase_price: '',
    selling_price: '',
    min_stock_level: 20,
    image_url: '',
    opening_stocks: {}
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (material) {
      setFormData({
        sku: material.sku || '',
        barcode: material.barcode || '',
        name: material.name || '',
        category_id: material.category_id || '',
        brand: material.brand || '',
        description: material.description || '',
        size: material.size || '',
        color: material.color || '',
        unit: material.unit || 'Box',
        purchase_price: material.purchase_price || '',
        selling_price: material.selling_price || '',
        min_stock_level: material.min_stock_level || 20,
        image_url: material.image_url || '',
        opening_stocks: {}
      });
    } else {
      const initialStocks = {};
      godowns.forEach((g) => {
        initialStocks[g.id] = 0;
      });

      setFormData({
        sku: '',
        barcode: '',
        name: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        brand: 'DecoStone',
        description: '',
        size: '',
        color: '',
        unit: 'Box',
        purchase_price: '',
        selling_price: '',
        min_stock_level: 20,
        image_url: '',
        opening_stocks: initialStocks
      });
    }
  }, [isOpen, material?.id]);

  useEffect(() => {
    if (!isOpen || material || godowns.length === 0) return;
    setFormData(current => {
      const missingStocks = godowns.filter(g => current.opening_stocks[g.id] === undefined);
      const defaultCategory = !current.category_id && categories.length > 0 ? categories[0].id : current.category_id;
      if (missingStocks.length === 0 && defaultCategory === current.category_id) return current;
      const opening_stocks = { ...current.opening_stocks };
      missingStocks.forEach(g => { opening_stocks[g.id] = 0; });
      return { ...current, category_id: defaultCategory, opening_stocks };
    });
  }, [isOpen, material, godowns, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (material) {
        await api.updateMaterial(material.id, formData);
        success(`Material "${formData.name}" updated successfully.`);
      } else {
        await api.createMaterial(formData);
        success(`Material "${formData.name}" created with initial warehouse stock.`);
      }
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      error(err.message || 'Failed to save material.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {material ? <Edit size={22} color="var(--primary)" /> : <PackagePlus size={22} color="var(--primary)" />}
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {material ? 'Edit Material Specification' : 'Add New Material'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Item SKU, Category, Dimensions, Pricing and Initial Warehouse Distribution
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Row 1: SKU, Name, Category */}
            <div className="grid-cols-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SKU / Code *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. TIL-001, MAR-102"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Material Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Royal White Glossy Tile"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Barcode (optional)</label>
                <input type="text" className="form-control" placeholder="Scan or enter barcode" value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value.trim() })} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category *</label>
                <select
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Brand, Size, Color, Unit */}
            <div className="grid-cols-4">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Brand</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. DecoStone Luxe"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Size / Dimension</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 600x600 mm, 8x4 ft"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Color / Finish</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Carrara White / Matt"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Unit *</label>
                <select
                  className="form-control"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                >
                  <option value="Box">Box</option>
                  <option value="Sq.Ft">Sq.Ft</option>
                  <option value="Piece">Piece</option>
                  <option value="Slab">Slab</option>
                  <option value="Meter">Meter</option>
                  <option value="Set">Set</option>
                </select>
              </div>
            </div>

            {/* Row 3: Pricing & Minimum Stock */}
            <div className="grid-cols-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-control"
                  placeholder="0.00"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Selling Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-control"
                  placeholder="0.00"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Min Stock Level (Alert)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 25"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Image URL & Preview */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Image URL</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
                {formData.image_url && (
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description & Specification Details</label>
              <textarea
                className="form-control"
                placeholder="Micro-crystalline glazed surface, anti-skid rating, application areas..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Opening Stocks Distribution (Only for new material creation) */}
            {!material && godowns.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px', color: 'var(--primary)' }}>
                  Opening Stock Distribution Across Godowns (Optional)
                </h4>
                <div className="grid-cols-4">
                  {godowns.map((g) => (
                    <div key={g.id} className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.name}</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="0"
                        value={formData.opening_stocks[g.id] || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opening_stocks: {
                              ...formData.opening_stocks,
                              [g.id]: e.target.value
                            }
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : material ? 'Update Material' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
