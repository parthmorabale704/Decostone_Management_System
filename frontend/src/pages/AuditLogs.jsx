import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldAlert, Search, RefreshCw, FileText, Calendar } from 'lucide-react';
import { exportToPdf, exportToExcel } from '../utils/exports';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ search, action: actionFilter, limit: 200 });
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleExportExcel = () => {
    const data = logs.map((l) => ({
      'Log ID': l.id,
      'Timestamp': l.created_at,
      'User Name': l.user_name,
      'Role': l.role,
      'Action': l.action,
      'Details': l.details,
      'Affected Table': l.affected_table,
      'Affected ID': l.affected_id,
      'IP Address': l.ip_address
    }));

    exportToExcel({
      data,
      filename: 'decostone_system_audit_logs'
    });
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
            <ShieldAlert size={28} color="#f59e0b" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Security & Activity Audit Log</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Permanent record of user logins, master data modifications, stock updates, and security events
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <FileText size={15} color="#10b981" /> Export Audit Trail
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by action, user, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: '200px' }}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Audit Actions</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="STOCK_IN">Stock IN Operations</option>
          <option value="STOCK_OUT">Stock OUT Operations</option>
          <option value="TRANSFER_STOCK">Warehouse Transfers</option>
          <option value="STOCK_ADJUSTMENT">Stock Adjustments</option>
          <option value="CREATE_MATERIAL">Material Additions</option>
          <option value="UPDATE_MATERIAL">Material Edits</option>
          <option value="DELETE_MATERIAL">Material Deletions</option>
          <option value="CREATE_USER">User Creations</option>
        </select>

        <button className="btn btn-secondary" onClick={loadLogs}>
          Search
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading audit trail records...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Staff User</th>
                <th>Role</th>
                <th>Action Type</th>
                <th>Operation Details</th>
                <th>Entity Target</th>
                <th>IP / Client</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    No audit records match the query.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{l.user_name}</td>
                    <td>
                      <span className={`badge badge-role-${l.role}`}>{l.role?.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', maxWidth: '420px' }}>
                      {l.details}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {l.affected_table ? `${l.affected_table} #${l.affected_id}` : '-'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{l.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
