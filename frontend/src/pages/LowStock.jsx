import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useStockSync } from '../hooks/useStockSync';
import { StockBadge } from '../components/StockBadge';
import { exportToPdf, exportToExcel } from '../utils/exports';
import {
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  FileSpreadsheet,
  FileText,
  Warehouse
} from 'lucide-react';

export function LowStock({ onOpenTransactionModal, onSelectMaterial }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLowStock = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getLowStock();
      if (res.success) {
        setItems(res.lowStockItems || []);
      }
    } catch (err) {
      console.error('Failed to load low stock alerts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadLowStock();
  }, []);

  useStockSync(() => {
    loadLowStock(true);
  });

  const handleExportExcel = () => {
    const data = items.map((i) => ({
      'Warehouse': i.godown_name,
      'Material Name': i.material_name,
      'SKU': i.sku,
      'Category': i.category_name,
      'Current Stock': i.current_stock,
      'Min Safety Stock': i.min_stock_level,
      'Deficit': Math.max(0, i.min_stock_level - i.current_stock),
      'Unit': i.unit,
      'Cost (₹)': i.purchase_price
    }));

    exportToExcel({
      data,
      filename: 'decostone_low_stock_reorder_sheet'
    });
  };

  const handleExportPdf = () => {
    const columns = ['Warehouse', 'Material', 'SKU', 'Category', 'Current Qty', 'Min Level', 'Deficit'];
    const rows = items.map((i) => [
      i.godown_name,
      i.material_name,
      i.sku,
      i.category_name,
      `${i.current_stock} ${i.unit}`,
      `${i.min_stock_level} ${i.unit}`,
      `${Math.max(0, i.min_stock_level - i.current_stock)} ${i.unit}`
    ]);

    exportToPdf({
      title: 'DecoStone Low Stock Reorder Warning Sheet',
      subtitle: `${items.length} Items Require Stock Inflow`,
      columns,
      rows,
      filename: 'decostone_low_stock_alerts'
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
            <AlertTriangle size={28} color="#f59e0b" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Low Stock Alert Command Center</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Materials at or below predefined warehouse safety threshold levels needing replenishment
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={15} color="#10b981" /> Export Reorder Sheet
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>
            <FileText size={15} color="#f43f5e" /> Export PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadLowStock}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Alert Banner */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          background: items.length > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${items.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: items.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: items.length > 0 ? '#f59e0b' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {items.length > 0 ? `${items.length} Materials Below Safety Level` : 'All Stock Levels Healthy'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {items.length > 0
                ? 'Review below and initiate Stock IN purchase receipts or warehouse transfer balancing.'
                : 'Zero items currently require emergency replenishment.'}
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Scanning warehouse stock thresholds...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Material</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Safety Stock</th>
                <th>Deficit to Safety</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>
                    🎉 All warehouse material inventories are above minimum safety thresholds!
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const deficit = Math.max(0, item.min_stock_level - item.current_stock);
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Warehouse size={15} color="var(--primary)" />
                          <span>{item.godown_name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <button
                          type="button"
                          className="table-link"
                          onClick={() => onSelectMaterial && onSelectMaterial(item.material_id)}
                        >
                          {item.material_name}
                        </button>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{item.sku}</span>
                      </td>
                      <td>{item.category_name}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800, color: item.current_stock === 0 ? '#f43f5e' : '#f59e0b' }}>
                        {item.current_stock} {item.unit}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {item.min_stock_level} {item.unit}
                      </td>
                      <td style={{ fontWeight: 700, color: '#f43f5e' }}>
                        +{deficit} {item.unit} needed
                      </td>
                      <td>
                        <StockBadge
                          status={item.current_stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'}
                          quantity={item.current_stock}
                          minStock={item.min_stock_level}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => onOpenTransactionModal && onOpenTransactionModal('STOCK_IN', item.material_id, item.godown_id)}
                        >
                          <ArrowDownLeft size={14} /> + Stock IN
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
