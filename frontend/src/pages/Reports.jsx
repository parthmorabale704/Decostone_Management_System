import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { exportToPdf, exportToExcel } from '../utils/exports';
import {
  FileBarChart,
  Warehouse,
  Layers,
  TrendingUp,
  Users,
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Calendar,
  Search
} from 'lucide-react';

export function Reports() {
  const [activeReport, setActiveReport] = useState('godown-wise');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let res;
      if (activeReport === 'godown-wise') {
        res = await api.getGodownWiseReport();
      } else if (activeReport === 'category-wise') {
        res = await api.getCategoryWiseReport();
      } else if (activeReport === 'movement') {
        res = await api.getMaterialMovementReport({ start_date: startDate, end_date: endDate });
      } else if (activeReport === 'user-activity') {
        res = await api.getUserActivityReport();
      }

      if (res?.success) {
        setReportData(res.report || []);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeReport, startDate, endDate]);

  useStockSync(() => {
    loadReport(true);
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let data = [];
    if (activeReport === 'godown-wise') {
      data = reportData.map((r) => ({
        'Warehouse': r.godown_name,
        'Material Name': r.material_name,
        'SKU': r.sku,
        'Category': r.category_name,
        'Current Stock': r.current_stock,
        'Unit': r.unit,
        'Valuation (₹)': r.stock_valuation
      }));
    } else if (activeReport === 'category-wise') {
      data = reportData.map((r) => ({
        'Category Name': r.category_name,
        'Active Materials Count': r.material_count,
        'Total Quantity': r.total_quantity,
        'Total Valuation (₹)': r.total_valuation
      }));
    } else if (activeReport === 'movement') {
      data = reportData.map((r) => ({
        'Material Name': r.material_name,
        'SKU': r.sku,
        'Category': r.category_name,
        'Total IN': r.total_in,
        'Total OUT': r.total_out,
        'Total Transferred': r.total_transferred,
        'Current Stock Balance': r.current_stock
      }));
    } else if (activeReport === 'user-activity') {
      data = reportData.map((r) => ({
        'User Name': r.name,
        'Username': r.username,
        'Role': r.role,
        'Transactions Recorded': r.transactions_performed,
        'Audit Actions': r.audit_actions_logged,
        'Last Active': r.last_active_at || 'Never'
      }));
    }

    exportToExcel({
      data,
      filename: `decostone_${activeReport}_report`
    });
  };

  const handleExportPdf = () => {
    let title = 'DecoStone Report';
    let columns = [];
    let rows = [];

    if (activeReport === 'godown-wise') {
      title = 'Godown-Wise Inventory Valuation Report';
      columns = ['Warehouse', 'Material', 'SKU', 'Category', 'Stock Qty', 'Valuation (₹)'];
      rows = reportData.map((r) => [
        r.godown_name,
        r.material_name,
        r.sku,
        r.category_name,
        `${r.current_stock} ${r.unit}`,
        `₹${Number(r.stock_valuation).toLocaleString()}`
      ]);
    } else if (activeReport === 'category-wise') {
      title = 'Category-Wise Stock Balance & Valuation Report';
      columns = ['Category Name', 'Items Count', 'Total Quantity', 'Stock Valuation (₹)'];
      rows = reportData.map((r) => [
        r.category_name,
        r.material_count,
        r.total_quantity,
        `₹${Number(r.total_valuation).toLocaleString()}`
      ]);
    } else if (activeReport === 'movement') {
      title = 'Material Movement & Inflow/Outflow Velocity Report';
      columns = ['Material', 'SKU', 'Category', 'Total IN', 'Total OUT', 'Transferred', 'Current Stock'];
      rows = reportData.map((r) => [
        r.material_name,
        r.sku,
        r.category_name,
        `+${r.total_in}`,
        `-${r.total_out}`,
        r.total_transferred,
        r.current_stock
      ]);
    } else if (activeReport === 'user-activity') {
      title = 'User Operational Activity & Audit Report';
      columns = ['User Name', 'Username', 'Role', 'Txns Logged', 'Audit Logs', 'Last Active'];
      rows = reportData.map((r) => [
        r.name,
        `@${r.username}`,
        r.role.toUpperCase(),
        r.transactions_performed,
        r.audit_actions_logged,
        r.last_active_at ? new Date(r.last_active_at).toLocaleString() : 'N/A'
      ]);
    }

    exportToPdf({
      title,
      columns,
      rows,
      filename: `decostone_${activeReport}_report`
    });
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div
        className="report-selector-grid"
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
            <FileBarChart size={28} color="var(--primary)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Reports & Analytics Export</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Generate, preview, print, and export warehouse stock balances and audit metrics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={15} color="#10b981" /> Export Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>
            <FileText size={15} color="#f43f5e" /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        <button
          type="button"
          className={`card ${activeReport === 'godown-wise' ? 'border-primary' : ''}`}
          aria-pressed={activeReport === 'godown-wise'}
          style={{
            cursor: 'pointer',
            border: activeReport === 'godown-wise' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: activeReport === 'godown-wise' ? 'var(--primary-light)' : 'var(--bg-card)',
            textAlign: 'left'
          }}
          onClick={() => setActiveReport('godown-wise')}
        >
          <Warehouse size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Godown-Wise Stock</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warehouse by warehouse breakdown & valuation</p>
        </button>

        <button
          type="button"
          className={`card ${activeReport === 'category-wise' ? 'border-primary' : ''}`}
          aria-pressed={activeReport === 'category-wise'}
          style={{
            cursor: 'pointer',
            border: activeReport === 'category-wise' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: activeReport === 'category-wise' ? 'var(--primary-light)' : 'var(--bg-card)',
            textAlign: 'left'
          }}
          onClick={() => setActiveReport('category-wise')}
        >
          <Layers size={20} color="#06b6d4" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Category-Wise Stock</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tiles, Marble, Sanitary classification totals</p>
        </button>

        <button
          type="button"
          className={`card ${activeReport === 'movement' ? 'border-primary' : ''}`}
          aria-pressed={activeReport === 'movement'}
          style={{
            cursor: 'pointer',
            border: activeReport === 'movement' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: activeReport === 'movement' ? 'var(--primary-light)' : 'var(--bg-card)',
            textAlign: 'left'
          }}
          onClick={() => setActiveReport('movement')}
        >
          <TrendingUp size={20} color="#10b981" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Material Velocity</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inflow vs Outflow movement velocity</p>
        </button>

        <button
          type="button"
          className={`card ${activeReport === 'user-activity' ? 'border-primary' : ''}`}
          aria-pressed={activeReport === 'user-activity'}
          style={{
            cursor: 'pointer',
            border: activeReport === 'user-activity' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: activeReport === 'user-activity' ? 'var(--primary-light)' : 'var(--bg-card)',
            textAlign: 'left'
          }}
          onClick={() => setActiveReport('user-activity')}
        >
          <Users size={20} color="#818cf8" style={{ marginBottom: '8px' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>User Activity Ledger</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff transactional volume & audit counts</p>
        </button>
      </div>

      {/* Date Filter (for movement report) */}
      {activeReport === 'movement' && (
        <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Calendar size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter Movement Period:</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '150px' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: 'var(--text-dim)' }}>to</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '150px' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={loadReport}>
            Apply Filter
          </button>
        </div>
      )}

      {/* Report Table Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Calculating metrics and compiling report...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            {activeReport === 'godown-wise' && (
              <>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Material</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Stock Quantity</th>
                    <th>Stock Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.godown_name}</td>
                      <td style={{ fontWeight: 600 }}>{r.material_name}</td>
                      <td><span className="badge badge-info">{r.sku}</span></td>
                      <td>{r.category_name}</td>
                      <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                        {r.current_stock} {r.unit}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{Number(r.stock_valuation).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeReport === 'category-wise' && (
              <>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Active SKUs Count</th>
                    <th>Total Quantity in Stock</th>
                    <th>Total Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>{r.category_name}</td>
                      <td><span className="badge badge-info">{r.material_count} Materials</span></td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800 }}>{r.total_quantity?.toLocaleString()} Units</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                        ₹{Number(r.total_valuation).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeReport === 'movement' && (
              <>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Total Received (IN)</th>
                    <th>Total Dispatched (OUT)</th>
                    <th>Inter-Warehouse Transferred</th>
                    <th>Current Total Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.material_name}</td>
                      <td><span className="badge badge-info">{r.sku}</span></td>
                      <td>{r.category_name}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>+{r.total_in} {r.unit}</td>
                      <td style={{ fontWeight: 700, color: '#f43f5e' }}>-{r.total_out} {r.unit}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.total_transferred} {r.unit}</td>
                      <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>{r.current_stock} {r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeReport === 'user-activity' && (
              <>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Stock Transactions Processed</th>
                    <th>Audit Actions Logged</th>
                    <th>Last Active Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>@{r.username}</td>
                      <td><span className={`badge badge-role-${r.role}`}>{r.role.toUpperCase()}</span></td>
                      <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>{r.transactions_performed}</td>
                      <td>{r.audit_actions_logged}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {r.last_active_at ? new Date(r.last_active_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
