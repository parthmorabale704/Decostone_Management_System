import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { exportToPdf, exportToExcel } from '../utils/exports';
import {
  History,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Calendar
} from 'lucide-react';

export function StockHistory({ onSelectMaterial }) {
  const [transactions, setTransactions] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [godownFilter, setGodownFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 100;

  const loadHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [txnRes, gdnRes, catRes] = await Promise.all([
        api.getTransactions({
          search,
          type: typeFilter,
          godown_id: godownFilter,
          start_date: startDate,
          end_date: endDate,
          limit: pageSize,
          offset
        }),
        api.getGodowns(),
        api.getCategories()
      ]);

      if (txnRes.success) { setTransactions(txnRes.transactions || []); setTotal(txnRes.total || 0); }
      if (gdnRes.success) setGodowns(gdnRes.godowns || []);
      if (catRes.success) setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [typeFilter, godownFilter, startDate, endDate, offset]);

  useStockSync(() => {
    loadHistory(true);
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (offset !== 0) { setOffset(0); return; }
    loadHistory();
  };

  const handleExportExcel = () => {
    const data = transactions.map((t) => ({
      'Transaction ID': t.transaction_id,
      'Date & Time': t.created_at,
      'Type': t.transaction_type,
      'Material Name': t.material_name,
      'SKU': t.material_sku,
      'Category': t.category_name,
      'Warehouse': t.godown_name,
      'Quantity': t.quantity,
      'Unit': t.material_unit,
      'Previous Stock': t.previous_stock,
      'New Stock': t.new_stock,
      'User': t.user_name,
      'Reference No': t.reference_no || '',
      'Partner / Party': t.partner_name || '',
      'Remarks': t.reason || ''
    }));

    exportToExcel({
      data,
      filename: 'decostone_stock_history_ledger'
    });
  };

  const handleExportPdf = () => {
    const columns = ['Txn ID', 'Date', 'Type', 'Material', 'Warehouse', 'Qty', 'Balance', 'User'];
    const rows = transactions.map((t) => [
      t.transaction_id,
      new Date(t.created_at).toLocaleDateString(),
      t.transaction_type.replace('_', ' '),
      `${t.material_name} (${t.material_sku})`,
      t.godown_name,
      `${t.quantity} ${t.material_unit}`,
      `${t.previous_stock} -> ${t.new_stock}`,
      t.user_name
    ]);

    exportToPdf({
      title: 'DecoStone Comprehensive Stock Audit Ledger',
      subtitle: `Total ${transactions.length} Transactions`,
      columns,
      rows,
      filename: 'decostone_stock_audit_ledger'
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
            <History size={28} color="var(--primary)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Complete Stock Audit Trail</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Immutable chronological ledger of all stock movement across 4 godowns with user accountability
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={15} color="#10b981" /> Export Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>
            <FileText size={15} color="#f43f5e" /> Export PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadHistory}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '14px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
              placeholder="Search by material, SKU, ref, partner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Transaction Type Filter */}
          <select
            className="form-control"
            style={{ width: '150px', fontSize: '0.85rem' }}
            value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
          >
            <option value="">All Types</option>
            <option value="STOCK_IN">Stock IN</option>
            <option value="STOCK_OUT">Stock OUT</option>
            <option value="TRANSFER_IN">Transfer IN</option>
            <option value="TRANSFER_OUT">Transfer OUT</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="OPENING_STOCK">Opening Stock</option>
          </select>

          {/* Godown Filter */}
          <select
            className="form-control"
            style={{ width: '140px', fontSize: '0.85rem' }}
            value={godownFilter}
            onChange={(e) => { setGodownFilter(e.target.value); setOffset(0); }}
          >
            <option value="">All Godowns</option>
            {godowns.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            className="form-control"
            style={{ width: '135px', fontSize: '0.8rem' }}
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
            title="Start Date"
          />
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>to</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '135px', fontSize: '0.8rem' }}
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
            title="End Date"
          />

          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setTypeFilter('');
              setGodownFilter('');
              setStartDate('');
              setEndDate('');
              setOffset(0);
              loadHistory();
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading audit trail ledger...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Material</th>
                <th>Godown</th>
                <th>Quantity</th>
                <th>Stock (Prev ➔ New)</th>
                <th>Authorized User</th>
                <th>Reference / Partner / Reason</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    No audit records match the selected query.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
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
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                          {tx.transaction_id}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${typeBadge}`}>
                          {tx.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => onSelectMaterial && onSelectMaterial(tx.material_id)}
                        >
                          {tx.material_name}
                        </button>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {tx.material_sku} • {tx.category_name}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{tx.godown_name}</td>
                      <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                        {tx.quantity} {tx.material_unit}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        {tx.previous_stock} ➔ <strong style={{ color: 'var(--text-main)' }}>{tx.new_stock}</strong>
                      </td>
                      <td>{tx.user_name}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {tx.reference_no && <strong style={{ color: 'var(--text-main)' }}>[{tx.reference_no}] </strong>}
                        {tx.partner_name && <span>{tx.partner_name} - </span>}
                        {tx.reason || ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination-controls"><span>Showing {total ? offset + 1 : 0}–{Math.min(offset + transactions.length, total)} of {total} transactions</span><div><button className="btn btn-secondary btn-sm" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</button><button className="btn btn-secondary btn-sm" disabled={offset + pageSize >= total || loading} onClick={() => setOffset(offset + pageSize)}>Next</button></div></div>
    </div>
  );
}
