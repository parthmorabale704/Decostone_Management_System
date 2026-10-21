import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Users as UsersIcon,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Warehouse,
  Check,
  X,
  RefreshCw,
  Power
} from 'lucide-react';

export function Users() {
  const { user: currentUser } = useAuth();
  const { success, error } = useNotification();

  const [users, setUsers] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    mobile: '',
    password: '',
    role: 'supervisor',
    assigned_godown_id: '',
    can_stock_in: 1,
    can_stock_out: 1,
    can_adjust: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const loadUsersAndGodowns = async () => {
    setLoading(true);
    try {
      const [uRes, gRes] = await Promise.all([
        api.getUsers(),
        api.getGodowns()
      ]);

      if (uRes.success) setUsers(uRes.users || []);
      if (gRes.success) setGodowns(gRes.godowns || []);
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndGodowns();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      mobile: '',
      password: '',
      role: 'supervisor',
      assigned_godown_id: godowns.length > 0 ? godowns[0].id : '',
      can_stock_in: 1,
      can_stock_out: 1,
      can_adjust: 0
    });
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      email: u.email,
      mobile: u.mobile || '',
      password: '',
      role: u.role,
      assigned_godown_id: u.assigned_godown_id || '',
      can_stock_in: u.can_stock_in ? 1 : 0,
      can_stock_out: u.can_stock_out ? 1 : 0,
      can_adjust: u.can_adjust ? 1 : 0
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        success(`User "${formData.name}" updated successfully.`);
      } else {
        await api.createUser(formData);
        success(`User "${formData.name}" created successfully.`);
      }
      setModalOpen(false);
      loadUsersAndGodowns();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, name) => {
    try {
      const res = await api.toggleUserStatus(id);
      success(res.message);
      loadUsersAndGodowns();
    } catch (err) {
      error(err.message || 'Failed to change status.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;

    try {
      await api.deleteUser(id);
      success(`User "${name}" deleted.`);
      loadUsersAndGodowns();
    } catch (err) {
      error(err.message || 'Failed to delete user.');
    }
  };

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
            <UsersIcon size={28} color="var(--primary)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>User Management & RBAC</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Configure system access, godown assignments, and granular operational permissions
          </p>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading user accounts...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Name</th>
                <th>Role</th>
                <th>Assigned Warehouse</th>
                <th>Stock IN Perm.</th>
                <th>Stock OUT Perm.</th>
                <th>Stock Adjust Perm.</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      @{u.username} • {u.email}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-role-${u.role}`}>{u.role.toUpperCase()}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Warehouse size={14} color="var(--primary)" />
                      <span style={{ fontWeight: 600 }}>
                        {u.assigned_godown_name || 'All Warehouses (Central)'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {u.can_stock_in ? (
                      <span className="badge badge-success">Allowed</span>
                    ) : (
                      <span className="badge badge-danger">Disabled</span>
                    )}
                  </td>
                  <td>
                    {u.can_stock_out ? (
                      <span className="badge badge-success">Allowed</span>
                    ) : (
                      <span className="badge badge-danger">Disabled</span>
                    )}
                  </td>
                  <td>
                    {u.can_adjust ? (
                      <span className="badge badge-success">Allowed</span>
                    ) : (
                      <span className="badge badge-danger">Disabled</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(u)}
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>

                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            className="btn-icon"
                            style={{ color: u.is_active ? '#f59e0b' : '#10b981' }}
                            onClick={() => handleToggleStatus(u.id, u.name)}
                            title={u.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            style={{ color: '#f43f5e' }}
                            onClick={() => handleDelete(u.id, u.name)}
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UsersIcon size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {editingUser ? 'Edit User Credentials & Access' : 'Create User Account'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid-cols-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Username *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. ramesh_g1"
                      value={formData.username}
                      disabled={Boolean(editingUser)}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="ramesh@decostone.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mobile Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 9876543210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Role *</label>
                    <select
                      className="form-control"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="admin">Admin (Full Control)</option>
                      <option value="manager">Manager (Operations)</option>
                      <option value="supervisor">Supervisor (Warehouse Staff)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Assigned Warehouse</label>
                    <select
                      className="form-control"
                      value={formData.assigned_godown_id}
                      onChange={(e) => setFormData({ ...formData, assigned_godown_id: e.target.value })}
                    >
                      <option value="">-- All Warehouses (Unrestricted) --</option>
                      {godowns.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {editingUser ? 'New Password (Leave blank to keep unchanged)' : 'Initial Password *'}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>

                {/* Granular Permission Toggles */}
                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '6px'
                  }}
                >
                  <label className="form-label" style={{ display: 'block', marginBottom: '10px' }}>
                    Granular Staff Permissions
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.can_stock_in)}
                        onChange={(e) => setFormData({ ...formData, can_stock_in: e.target.checked ? 1 : 0 })}
                      />
                      <span>Allow Stock IN (Receive Shipments & Invoices)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.can_stock_out)}
                        onChange={(e) => setFormData({ ...formData, can_stock_out: e.target.checked ? 1 : 0 })}
                      />
                      <span>Allow Stock OUT (Dispatch Goods & Sales)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.can_adjust)}
                        onChange={(e) => setFormData({ ...formData, can_adjust: e.target.checked ? 1 : 0 })}
                      />
                      <span>Allow Stock Adjustment (Physical Audit Discrepancies)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
