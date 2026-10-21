import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { X, Layers, PlusCircle } from 'lucide-react';

export function CategoryModal({ isOpen, onClose, category = null, onSuccess }) {
  const { success, error } = useNotification();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setImageUrl(category.image_url || '');
    } else {
      setName('');
      setDescription('');
      setImageUrl('');
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (category) {
        await api.updateCategory(category.id, { name, description, image_url: imageUrl });
        success(`Category "${name}" updated successfully.`);
      } else {
        await api.createCategory({ name, description, image_url: imageUrl });
        success(`Category "${name}" created successfully.`);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      error(err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {category ? 'Edit Category' : 'Create New Category'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Organize materials into customizable stone & sanitary ware groups
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Tiles, Marble & Granite, Bathroom Ware"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cover Image URL</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                placeholder="Describe what items belong in this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
