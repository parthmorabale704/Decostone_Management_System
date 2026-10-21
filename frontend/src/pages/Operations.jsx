import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Download, Plus, RefreshCw, ClipboardCheck, ShoppingCart, Truck, Users, Barcode, Printer } from 'lucide-react';

const tabs = [
  { id: 'orders', label: 'Purchase & sales', icon: ShoppingCart },
  { id: 'replenishment', label: 'Reorder suggestions', icon: Truck },
  { id: 'lots', label: 'Lots & shade', icon: Truck },
  { id: 'parties', label: 'Suppliers & customers', icon: Users },
  { id: 'counts', label: 'Cycle counts', icon: ClipboardCheck },
  { id: 'labels', label: 'Scan & print labels', icon: Barcode },
  { id: 'backup', label: 'Database backup', icon: Download }
];

// Code 39 narrow/wide masks (same symbology values used by ZXing's Code39Reader).
const code39Alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const code39Masks = [0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00D,0x10C,0x04C,0x01C,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0C1,0x1C0,0x091,0x190,0x0D0,0x085,0x184,0x0C4,0x0A8,0x0A2,0x08A,0x02A];

function Code39Svg({ value }) {
  const text = String(value || '').toUpperCase();
  if (!text || [...text].some((character) => !code39Alphabet.includes(character))) return <p className="text-muted">This code contains characters unsupported by Code 39. Use A–Z, 0–9, space, or - . $ / + %.</p>;
  const masks = [0x094, ...[...text].map((character) => code39Masks[code39Alphabet.indexOf(character)]), 0x094];
  let cursor = 10;
  const bars = [];
  for (const mask of masks) {
    for (let bit = 8; bit >= 0; bit -= 1) {
      const width = (mask & (1 << bit)) ? 3 : 1;
      if (bit % 2 === 0) bars.push(<rect key={`${cursor}-${bit}`} x={cursor} y="0" width={width} height="46" />);
      cursor += width;
    }
    cursor += 1;
  }
  return <svg className="operations-barcode" role="img" aria-label={`Code 39 barcode for ${text}`} viewBox={`0 0 ${cursor + 10} 68`} xmlns="http://www.w3.org/2000/svg"><title>Code 39 barcode: {text}</title><g fill="#111">{bars}</g><text x={(cursor + 10) / 2} y="65" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#111">{text}</text></svg>;
}

export function Operations() {
  const { user } = useAuth();
  const notify = useNotification();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [activeOrderDetails, setActiveOrderDetails] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [counts, setCounts] = useState([]);
  const [lots, setLots] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [reorderSupplier, setReorderSupplier] = useState('');
  const [activeCount, setActiveCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState('PURCHASE');
  const [partyForm, setPartyForm] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', tax_id: '' });
  const [partyType, setPartyType] = useState('supplier');
  const [orderForm, setOrderForm] = useState({ party_id: '', godown_id: '', material_id: '', quantity: '', unit_price: '', lot_code: '', shade_code: '', caliber: '', expiry_date: '', notes: '' });
  const [additionalLines, setAdditionalLines] = useState([]);
  const [scanText, setScanText] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const canManageParties = ['admin', 'manager'].includes(user?.role);
  const canApprove = ['admin', 'manager'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, supplierRes, customerRes, godownRes, materialRes, countRes, lotRes, lowStockRes] = await Promise.all([
        api.getOrders(), api.getSuppliers(), api.getCustomers(), api.getGodowns(), api.getMaterials({ limit: 500 }), api.getCounts(), api.getLots(), api.getLowStock()
      ]);
      setOrders(orderRes.orders || []); setSuppliers(supplierRes.suppliers || []); setCustomers(customerRes.customers || []);
      setGodowns(godownRes.godowns || []); setMaterials(materialRes.materials || []); setCounts(countRes.sessions || []);
      setLots(lotRes.lots || []);
      setLowStockItems(lowStockRes.lowStockItems || []);
    } catch (error) { notify.error(error.message || 'Could not load operations data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!cameraOn || tab !== 'labels') return undefined;
    let stream;
    let interval;
    let stopped = false;
    const begin = async () => {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
        notify.warning('Camera barcode scanning is not supported in this browser. Use a USB scanner or type the SKU.');
        setCameraOn(false);
        return;
      }
      try {
        const detector = new window.BarcodeDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (stopped) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        interval = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const hits = await detector.detect(videoRef.current);
            if (!hits.length) return;
            const raw = hits[0].rawValue;
            const match = materials.find((item) => String(item.sku).toLowerCase() === raw.toLowerCase() || String(item.barcode || '').toLowerCase() === raw.toLowerCase());
            setScanText(raw); setScannedItem(match?.id || null); setCameraOn(false);
            if (!match) notify.warning('Scanned code does not match a material SKU or barcode.');
          } catch { /* Keep scanning when one camera frame cannot be decoded. */ }
        }, 350);
      } catch (error) { notify.error(`Could not open the camera: ${error.message}`); setCameraOn(false); }
    };
    begin();
    return () => { stopped = true; window.clearInterval(interval); stream?.getTracks().forEach((track) => track.stop()); };
  }, [cameraOn, tab, materials]);
  const parties = orderType === 'PURCHASE' ? suppliers : customers;
  const labelItem = useMemo(() => materials.find((item) => String(item.id) === String(scannedItem)), [materials, scannedItem]);

  const createParty = async (event, kind = partyType) => {
    event.preventDefault();
    try {
      const create = kind === 'supplier' ? api.createSupplier : api.createCustomer;
      await create(partyForm); setPartyForm({ name: '', contact_name: '', phone: '', email: '', address: '', tax_id: '' });
      notify.success(`${kind === 'supplier' ? 'Supplier' : 'Customer'} added.`); load();
    } catch (error) { notify.error(error.message); }
  };

  const createOrder = async (event) => {
    event.preventDefault();
    try {
      await api.createOrder({ ...orderForm, order_type: orderType, lines: [{ material_id: orderForm.material_id, quantity: orderForm.quantity, unit_price: orderForm.unit_price, lot_code: orderForm.lot_code, shade_code: orderForm.shade_code, caliber: orderForm.caliber, expiry_date: orderForm.expiry_date }, ...additionalLines] });
      setOrderForm((current) => ({ ...current, material_id: '', quantity: '', unit_price: '', lot_code: '', shade_code: '', caliber: '', expiry_date: '', notes: '' }));
      setAdditionalLines([]);
      notify.success('Draft order created. Submit it for approval when ready.'); load();
    } catch (error) { notify.error(error.message); }
  };

  const runOrderAction = async (order, action) => {
    try { await api.orderAction(order.id, action); notify.success(`Order ${action} completed.`); load(); }
    catch (error) { notify.error(error.message); }
  };

  const openOrderDetails = async (id) => {
    try { const response = await api.getOrder(id); setActiveOrderDetails(response.order); }
    catch (error) { notify.error(error.message || 'Could not load order details.'); }
  };

  const createReorderDraft = async (item) => {
    if (!reorderSupplier) return notify.warning('Select a supplier first.');
    try {
      const target = Math.max(Number(item.min_stock_level) * 2, Number(item.min_stock_level));
      await api.createOrder({ order_type: 'PURCHASE', party_id: reorderSupplier, godown_id: item.godown_id,
        notes: 'Suggested reorder from low-stock threshold.',
        lines: [{ material_id: item.material_id, quantity: Math.max(target - Number(item.current_stock), 1), unit_price: item.purchase_price || 0 }] });
      notify.success(`Reorder draft created for ${item.material_name}.`); load();
    } catch (error) { notify.error(error.message); }
  };

  const startCount = async () => {
    try { const result = await api.createCount({ godown_id: orderForm.godown_id || godowns[0]?.id }); await load(); await openCount(result.session.id); }
    catch (error) { notify.error(error.message); }
  };
  const openCount = async (id) => {
    try { const result = await api.getCount(id); setActiveCount(result.session); }
    catch (error) { notify.error(error.message); }
  };
  const saveCountLine = async (line, value) => {
    if (value === '' || value === null || !activeCount) return;
    try {
      await api.updateCountLine(activeCount.id, line.id, Number(value));
      setActiveCount((current) => current ? ({ ...current, lines: current.lines.map((row) => row.id === line.id ? { ...row, counted_quantity: Number(value) } : row) }) : current);
    }
    catch (error) { notify.error(error.message); }
  };
  const countAction = async (id, action) => {
    try {
      if (action === 'submit' && activeCount) {
        await Promise.all(activeCount.lines.filter((line) => line.counted_quantity !== null && line.counted_quantity !== undefined)
          .map((line) => api.updateCountLine(activeCount.id, line.id, Number(line.counted_quantity))));
      }
      if (action === 'submit') await api.submitCount(id); else await api.reviewCount(id, action);
      notify.success(`Count ${action} completed.`); setActiveCount(null); load();
    } catch (error) { notify.error(error.message); }
  };
  const downloadBackup = async () => {
    try {
      const token = localStorage.getItem('decostone_token');
      const response = await fetch('/api/operations/database/backup', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'Backup failed.'); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = `decostone-${new Date().toISOString().slice(0, 10)}.db`; link.click(); URL.revokeObjectURL(url);
      notify.success('Database backup downloaded.');
    } catch (error) { notify.error(error.message); }
  };

  const scan = (event) => {
    event.preventDefault();
    const value = scanText.trim().toLowerCase();
    const match = materials.find((item) => String(item.sku).toLowerCase() === value || String(item.barcode || '').toLowerCase() === value);
    setScannedItem(match?.id || null);
    if (!match) notify.warning('No material matches that SKU or barcode.');
  };

  return (
    <div className="page-wrapper">
      <div className="page-heading-row">
        <div><h1>Operations</h1><p className="text-muted">Orders, supplier records, stock counts and data protection.</p></div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="operations-tabs" role="tablist" aria-label="Operations tools">
        {tabs.filter((item) => item.id !== 'backup' || user?.role === 'admin').map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab(id); setActiveCount(null); }}><Icon size={16} />{label}</button>
        ))}
      </div>

      {tab === 'orders' && <section className="card operations-panel">
        <h2>Create a purchase or sales order</h2>
        <form className="operations-form-grid" onSubmit={createOrder}>
          <label className="form-group"><span className="form-label">Order type</span><select className="form-control" value={orderType} onChange={(e) => { setOrderType(e.target.value); setOrderForm((v) => ({ ...v, party_id: '' })); }}><option value="PURCHASE">Purchase order</option><option value="SALES">Sales order</option></select></label>
          <label className="form-group"><span className="form-label">Supplier / customer</span><select required className="form-control" value={orderForm.party_id} onChange={(e) => setOrderForm({ ...orderForm, party_id: e.target.value })}><option value="">Choose one</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="form-group"><span className="form-label">Warehouse</span><select required className="form-control" value={orderForm.godown_id} onChange={(e) => setOrderForm({ ...orderForm, godown_id: e.target.value })}><option value="">Choose one</option>{godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="form-group"><span className="form-label">Material</span><select required className="form-control" value={orderForm.material_id} onChange={(e) => setOrderForm({ ...orderForm, material_id: e.target.value })}><option value="">Choose one</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}</select></label>
          <label className="form-group"><span className="form-label">Quantity</span><input required min="0.001" step="any" type="number" className="form-control" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} /></label>
          <label className="form-group"><span className="form-label">Unit price</span><input min="0" step="any" type="number" className="form-control" value={orderForm.unit_price} onChange={(e) => setOrderForm({ ...orderForm, unit_price: e.target.value })} /></label>
          {orderType === 'PURCHASE' && <>
            <label className="form-group"><span className="form-label">Lot / batch</span><input className="form-control" value={orderForm.lot_code} onChange={(e) => setOrderForm({ ...orderForm, lot_code: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Shade</span><input className="form-control" value={orderForm.shade_code} onChange={(e) => setOrderForm({ ...orderForm, shade_code: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Caliber</span><input className="form-control" value={orderForm.caliber} onChange={(e) => setOrderForm({ ...orderForm, caliber: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Expiry date</span><input type="date" className="form-control" value={orderForm.expiry_date} onChange={(e) => setOrderForm({ ...orderForm, expiry_date: e.target.value })} /></label>
          </>}
          {additionalLines.map((line, index) => <div className="operations-extra-line" key={index}>
            <label className="form-group"><span className="form-label">Additional material</span><select required className="form-control" value={line.material_id} onChange={(e) => setAdditionalLines((rows) => rows.map((row, i) => i === index ? { ...row, material_id: e.target.value } : row))}><option value="">Choose one</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}</select></label>
            <label className="form-group"><span className="form-label">Quantity</span><input required type="number" min="0.001" step="any" className="form-control" value={line.quantity} onChange={(e) => setAdditionalLines((rows) => rows.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} /></label>
            <label className="form-group"><span className="form-label">Unit price</span><input type="number" min="0" step="any" className="form-control" value={line.unit_price} onChange={(e) => setAdditionalLines((rows) => rows.map((row, i) => i === index ? { ...row, unit_price: e.target.value } : row))} /></label>
            {orderType === 'PURCHASE' && <label className="form-group"><span className="form-label">Lot code</span><input className="form-control" value={line.lot_code} onChange={(e) => setAdditionalLines((rows) => rows.map((row, i) => i === index ? { ...row, lot_code: e.target.value } : row))} /></label>}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdditionalLines((rows) => rows.filter((_, i) => i !== index))}>Remove line</button>
          </div>)}
          <button type="button" className="btn btn-secondary" onClick={() => setAdditionalLines((rows) => [...rows, { material_id: '', quantity: '', unit_price: '', lot_code: '' }])}><Plus size={15} /> Add another line</button>
          <button className="btn btn-primary" type="submit"><Plus size={16} /> Create draft</button>
        </form>
        <div className="table-responsive"><table className="data-table"><thead><tr><th>Order</th><th>Type</th><th>Party</th><th>Warehouse</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id}><td>{order.order_no}</td><td>{order.order_type}</td><td>{order.party_name}</td><td>{order.godown_name}</td><td>{order.status.replace('_', ' ')}</td><td>{new Date(order.created_at).toLocaleDateString()}</td><td className="operations-row-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => openOrderDetails(order.id)}>{order.line_count} lines · Details</button>
            {order.status === 'DRAFT' && <button className="btn btn-sm btn-secondary" onClick={() => runOrderAction(order, 'submit')}>Submit</button>}
            {order.status === 'PENDING_APPROVAL' && canApprove && Number(order.created_by) !== Number(user.id) && <><button className="btn btn-sm btn-primary" onClick={() => runOrderAction(order, 'approve')}>Approve &amp; post</button><button className="btn btn-sm btn-outline" onClick={() => runOrderAction(order, 'reject')}>Reject</button></>}
            {order.status === 'PENDING_APPROVAL' && Number(order.created_by) === Number(user.id) && <span className="text-muted">Awaiting another manager</span>}
            {order.status === 'DRAFT' && <button className="btn btn-sm btn-outline" onClick={() => runOrderAction(order, 'cancel')}>Cancel</button>}
          </td></tr>)}
        </tbody></table></div>
        {activeOrderDetails && <div className="operations-order-details"><div className="operations-section-heading"><div><h3>{activeOrderDetails.order_no} · {activeOrderDetails.party_name}</h3><p className="text-muted">{activeOrderDetails.status} · {activeOrderDetails.godown_name}</p></div><button className="btn btn-secondary btn-sm" onClick={() => setActiveOrderDetails(null)}>Close details</button></div><div className="table-responsive"><table className="data-table"><thead><tr><th>Material</th><th>SKU</th><th>Quantity</th><th>Unit price</th><th>Lot / shade / caliber</th></tr></thead><tbody>{activeOrderDetails.lines.map((line) => <tr key={line.id}><td>{line.material_name}</td><td>{line.sku}</td><td>{line.quantity} {line.unit}</td><td>{line.unit_price}</td><td>{[line.lot_code,line.shade_code,line.caliber].filter(Boolean).join(' · ') || '—'}</td></tr>)}</tbody></table></div></div>}
      </section>}

      {tab === 'replenishment' && <section className="card operations-panel"><div className="operations-section-heading"><div><h2>Low-stock reorder suggestions</h2><p className="text-muted">Suggested quantity brings stock up to twice the configured minimum.</p></div><select aria-label="Supplier for suggested orders" className="form-control operations-warehouse-select" value={reorderSupplier} onChange={(e) => setReorderSupplier(e.target.value)}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div><div className="table-responsive"><table className="data-table"><thead><tr><th>Material</th><th>Warehouse</th><th>On hand</th><th>Minimum</th><th>Suggested order</th><th></th></tr></thead><tbody>{lowStockItems.map((item) => <tr key={`${item.godown_id}-${item.material_id}`}><td>{item.material_name} <small>{item.sku}</small></td><td>{item.godown_name}</td><td>{item.current_stock} {item.unit}</td><td>{item.min_stock_level} {item.unit}</td><td>{Math.max(Number(item.min_stock_level) * 2 - Number(item.current_stock), 1)} {item.unit}</td><td><button className="btn btn-sm btn-primary" onClick={() => createReorderDraft(item)}>Create PO draft</button></td></tr>)}</tbody></table></div></section>}

      {tab === 'parties' && <section className="operations-columns">
        {['supplier','customer'].map((kind) => {
          const list = kind === 'supplier' ? suppliers : customers;
          return <div className="card operations-panel" key={kind}><h2>{kind === 'supplier' ? 'Suppliers' : 'Customers'}</h2>
            {canManageParties && <form className="operations-party-form" onSubmit={(e) => createParty(e, kind)}>
              <label className="form-group"><span className="form-label">Name</span><input required className="form-control" value={partyType === kind ? partyForm.name : ''} onFocus={() => setPartyType(kind)} onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })} /></label>
              <label className="form-group"><span className="form-label">Contact person</span><input className="form-control" value={partyType === kind ? partyForm.contact_name : ''} onFocus={() => setPartyType(kind)} onChange={(e) => setPartyForm({ ...partyForm, contact_name: e.target.value })} /></label>
              <label className="form-group"><span className="form-label">Phone</span><input className="form-control" value={partyType === kind ? partyForm.phone : ''} onFocus={() => setPartyType(kind)} onChange={(e) => setPartyForm({ ...partyForm, phone: e.target.value })} /></label>
              <label className="form-group"><span className="form-label">Email</span><input type="email" className="form-control" value={partyType === kind ? partyForm.email : ''} onFocus={() => setPartyType(kind)} onChange={(e) => setPartyForm({ ...partyForm, email: e.target.value })} /></label>
              <label className="form-group"><span className="form-label">Address</span><input className="form-control" value={partyType === kind ? partyForm.address : ''} onFocus={() => setPartyType(kind)} onChange={(e) => setPartyForm({ ...partyForm, address: e.target.value })} /></label>
              <label className="form-group"><span className="form-label">Tax ID</span><input className="form-control" value={partyType === kind ? partyForm.tax_id : ''} onFocus={() => setPartyType(kind)} onChange={(e) => setPartyForm({ ...partyForm, tax_id: e.target.value })} /></label>
              <button className="btn btn-primary"><Plus size={15} /> Add {kind}</button>
            </form>}
            <ul className="operations-party-list">{list.map((party) => <li key={party.id}><strong>{party.name}</strong><span>{party.phone || party.email || 'No contact added'}</span></li>)}</ul>
          </div>;
        })}
      </section>}

      {tab === 'lots' && <section className="card operations-panel"><h2>Tracked batches and shade / caliber</h2><p className="text-muted">Purchase receipts with lot data appear here. Existing untracked opening stock remains available as aggregate stock.</p><div className="table-responsive"><table className="data-table"><thead><tr><th>Material</th><th>SKU</th><th>Lot</th><th>Shade</th><th>Caliber</th><th>Warehouse</th><th>Qty</th><th>Expiry</th></tr></thead><tbody>{lots.map((lot) => <tr key={lot.id}><td>{lot.material_name}</td><td>{lot.sku}</td><td>{lot.lot_code}</td><td>{lot.shade_code || '—'}</td><td>{lot.caliber || '—'}</td><td>{lot.godown_name}</td><td>{lot.quantity} {lot.unit}</td><td>{lot.expiry_date || '—'}</td></tr>)}</tbody></table></div></section>}

      {tab === 'counts' && <section className="card operations-panel">
        <div className="operations-section-heading"><div><h2>Physical stock counts</h2><p className="text-muted">Counts are reviewed before they change inventory.</p></div>
          {!activeCount && <><select aria-label="Warehouse for count" className="form-control operations-warehouse-select" value={orderForm.godown_id} onChange={(e) => setOrderForm({ ...orderForm, godown_id: e.target.value })}>{godowns.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><button className="btn btn-primary" onClick={startCount}><Plus size={16} /> Start count</button></>}
        </div>
        {activeCount ? <>
          <h3>{activeCount.session_no} · {activeCount.godown_name} · {activeCount.status}</h3>
          <div className="table-responsive"><table className="data-table"><thead><tr><th>Material</th><th>SKU</th><th>Expected</th><th>Counted</th><th>Variance</th></tr></thead><tbody>
            {activeCount.lines.map((line) => <tr key={line.id}><td>{line.material_name}</td><td>{line.sku}</td><td>{line.expected_quantity} {line.unit}</td><td><input aria-label={`Count ${line.material_name}`} type="number" min="0" step="any" className="form-control operations-count-input" value={line.counted_quantity ?? ''} disabled={activeCount.status !== 'DRAFT'} onChange={(e) => setActiveCount((current) => ({ ...current, lines: current.lines.map((row) => row.id === line.id ? { ...row, counted_quantity: e.target.value === '' ? null : Number(e.target.value) } : row) }))} onBlur={(e) => saveCountLine(line, e.target.value)} /></td><td>{line.counted_quantity == null ? '—' : Number(line.counted_quantity) - Number(line.expected_quantity)}</td></tr>)}
          </tbody></table></div>
          <div className="operations-row-actions">{activeCount.status === 'DRAFT' && <button className="btn btn-primary" onClick={() => countAction(activeCount.id, 'submit')}>Submit count</button>}{activeCount.status === 'PENDING_APPROVAL' && canApprove && Number(activeCount.created_by) !== Number(user.id) && <><button className="btn btn-primary" onClick={() => countAction(activeCount.id, 'approve')}>Approve count</button><button className="btn btn-secondary" onClick={() => countAction(activeCount.id, 'reject')}>Reject</button></>}{activeCount.status === 'PENDING_APPROVAL' && Number(activeCount.created_by) === Number(user.id) && <span className="text-muted">Awaiting another manager.</span>}<button className="btn btn-secondary" onClick={() => setActiveCount(null)}>Close</button></div>
        </> : <div className="table-responsive"><table className="data-table"><thead><tr><th>Session</th><th>Warehouse</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>{counts.map((count) => <tr key={count.id}><td>{count.session_no}</td><td>{count.godown_name}</td><td>{count.status}</td><td>{new Date(count.created_at).toLocaleDateString()}</td><td><button className="btn btn-sm btn-secondary" onClick={() => openCount(count.id)}>Open</button></td></tr>)}</tbody></table></div>}
      </section>}

      {tab === 'labels' && <section className="card operations-panel">
        <h2>Scanner and material labels</h2><p className="text-muted">USB and Bluetooth barcode scanners that type into the focused field can look up a material by SKU. Select a material to print a shelf label.</p>
        <form className="operations-scan-form" onSubmit={scan}><label className="form-group"><span className="form-label">Scan or enter SKU / barcode</span><input autoFocus className="form-control" value={scanText} onChange={(e) => setScanText(e.target.value)} placeholder="Scan a code, then press Enter" /></label><button className="btn btn-primary"><Barcode size={16} /> Find item</button><button type="button" className="btn btn-secondary" onClick={() => setCameraOn((value) => !value)}>{cameraOn ? 'Stop camera' : 'Use camera'}</button></form>
        {cameraOn && <video ref={videoRef} className="operations-camera" muted playsInline aria-label="Camera barcode scanner" />}
        {labelItem && <div className="operations-label-preview"><div><small>DECOSTONE · INVENTORY</small><strong>{labelItem.name}</strong><Code39Svg value={labelItem.barcode || labelItem.sku} /><span>SKU: {labelItem.sku}</span><span>{labelItem.size || ''} {labelItem.color || ''}</span></div><button className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={16} /> Print label</button></div>}
      </section>}

      {tab === 'backup' && user?.role === 'admin' && <section className="card operations-panel"><h2>Database backup</h2><p>Create and download a consistent SQLite backup. Store a copy outside this computer and verify it regularly.</p><button className="btn btn-primary" onClick={downloadBackup}><Download size={16} /> Create backup</button><p className="text-muted">Restoring replaces the active database. Use the documented offline restore command after confirming the target file.</p></section>}
    </div>
  );
}
