const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { logAudit } = require('../services/auditService');
const { consumeTrackedLots } = require('../services/stockService');

function fail(res, error, status = 400) {
  return res.status(status).json({ success: false, message: error.message || String(error) });
}

function partyList(table) {
  return (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM ${table} WHERE is_active = 1 ORDER BY name`).all();
      res.json({ success: true, [table]: rows });
    } catch (error) { fail(res, error, 500); }
  };
}

function createParty(table) {
  return (req, res) => {
    try {
      const { name, contact_name, email, phone, address, tax_id, notes } = req.body;
      if (!String(name || '').trim()) return fail(res, new Error('Name is required.'));
      const result = db.prepare(`INSERT INTO ${table} (name, contact_name, email, phone, address, tax_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(name.trim(), contact_name || null, email || null, phone || null, address || null, tax_id || null, notes || null);
      res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (error) { fail(res, error); }
  };
}

function listOrders(req, res) {
  try {
    const type = ['PURCHASE', 'SALES'].includes(req.query.type) ? req.query.type : null;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const rows = db.prepare(`SELECT o.*, g.name godown_name, u.name created_by_name,
        CASE WHEN o.order_type='PURCHASE' THEN s.name ELSE c.name END party_name,
        (SELECT COUNT(*) FROM inventory_order_lines l WHERE l.order_id=o.id) line_count
      FROM inventory_orders o JOIN godowns g ON g.id=o.godown_id JOIN users u ON u.id=o.created_by
      LEFT JOIN suppliers s ON o.order_type='PURCHASE' AND s.id=o.party_id
      LEFT JOIN customers c ON o.order_type='SALES' AND c.id=o.party_id
      WHERE (? IS NULL OR o.order_type=?) AND (?=1 OR o.godown_id=?)
      ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`)
      .all(type, type, req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0,
        req.user.assigned_godown_id || -1, limit, offset);
    res.json({ success: true, orders: rows });
  } catch (error) { fail(res, error, 500); }
}

function createOrder(req, res) {
  try {
    const { order_type, party_id, godown_id, notes, lines } = req.body;
    if (!['PURCHASE', 'SALES'].includes(order_type) || !Number(party_id) || !Number(godown_id) || !Array.isArray(lines) || !lines.length)
      return fail(res, new Error('Order type, party, warehouse and at least one line are required.'));
    if (req.user.role === 'supervisor' && Number(godown_id) !== Number(req.user.assigned_godown_id)) return fail(res, new Error('You cannot create an order for this warehouse.'), 403);
    const partyTable = order_type === 'PURCHASE' ? 'suppliers' : 'customers';
    if (!db.prepare(`SELECT id FROM ${partyTable} WHERE id=? AND is_active=1`).get(Number(party_id))) return fail(res, new Error('Supplier or customer not found.'));
    const insert = db.transaction(() => {
      const seq = db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM inventory_orders').get().n;
      const orderNo = `${order_type === 'PURCHASE' ? 'PO' : 'SO'}-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
      const order = db.prepare(`INSERT INTO inventory_orders (order_no,order_type,party_id,godown_id,notes,created_by)
        VALUES (?,?,?,?,?,?)`).run(orderNo, order_type, Number(party_id), Number(godown_id), notes || null, req.user.id);
      const addLine = db.prepare(`INSERT INTO inventory_order_lines (order_id,material_id,quantity,unit_price,lot_code,shade_code,caliber,expiry_date) VALUES (?,?,?,?,?,?,?,?)`);
      for (const line of lines) {
        const qty = Number(line.quantity), price = Number(line.unit_price || 0);
        if (!Number(line.material_id) || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) throw new Error('Order lines need a material and positive quantity.');
        addLine.run(order.lastInsertRowid, Number(line.material_id), qty, price, line.lot_code || null, line.shade_code || null, line.caliber || null, line.expiry_date || null);
      }
      return { id: order.lastInsertRowid, order_no: orderNo };
    });
    const order = insert();
    logAudit(req, 'ORDER_CREATED', `${order_type} order ${order.order_no} created.`, 'inventory_orders', order.id);
    res.status(201).json({ success: true, order });
  } catch (error) { fail(res, error); }
}

function getOrder(req, res) {
  try {
    const order = db.prepare(`SELECT o.*, g.name godown_name,
      CASE WHEN o.order_type='PURCHASE' THEN s.name ELSE c.name END party_name
      FROM inventory_orders o JOIN godowns g ON g.id=o.godown_id
      LEFT JOIN suppliers s ON o.order_type='PURCHASE' AND s.id=o.party_id
      LEFT JOIN customers c ON o.order_type='SALES' AND c.id=o.party_id WHERE o.id=?`).get(req.params.id);
    if (!order) return fail(res, new Error('Order not found.'), 404);
    if (req.user.role === 'supervisor' && Number(order.godown_id) !== Number(req.user.assigned_godown_id)) return fail(res, new Error('Access denied.'), 403);
    order.lines = db.prepare(`SELECT l.*,m.name material_name,m.sku,m.unit FROM inventory_order_lines l JOIN materials m ON m.id=l.material_id WHERE l.order_id=?`).all(order.id);
    res.json({ success: true, order });
  } catch (error) { fail(res, error, 500); }
}

function transitionOrder(req, res) {
  try {
    const { action } = req.params;
    const order = db.prepare('SELECT * FROM inventory_orders WHERE id=?').get(req.params.id);
    if (!order) return fail(res, new Error('Order not found.'), 404);
    if (req.user.role === 'supervisor' && Number(order.godown_id) !== Number(req.user.assigned_godown_id)) return fail(res, new Error('Access denied.'), 403);
    const allowed = {
      submit: ['DRAFT', 'PENDING_APPROVAL'], approve: ['PENDING_APPROVAL', 'APPROVED'],
      reject: ['PENDING_APPROVAL', 'REJECTED'], cancel: ['DRAFT', 'CANCELLED']
    };
    if (!allowed[action]) return fail(res, new Error('Unsupported order action.'), 404);
    if (order.status !== allowed[action][0]) return fail(res, new Error(`Cannot ${action} an order in ${order.status} status.`));
    if (['approve', 'reject'].includes(action) && !['admin', 'manager'].includes(req.user.role)) return fail(res, new Error('Manager approval is required.'), 403);
    if (['approve', 'reject'].includes(action) && Number(order.created_by) === Number(req.user.id)) return fail(res, new Error('A different manager must review this order.'), 403);
    let next = allowed[action][1];
    const change = db.transaction(() => {
      if (action === 'approve') {
        const lines = db.prepare('SELECT * FROM inventory_order_lines WHERE order_id=?').all(order.id);
        const partyTable = order.order_type === 'PURCHASE' ? 'suppliers' : 'customers';
        const party = db.prepare(`SELECT name FROM ${partyTable} WHERE id=?`).get(order.party_id)?.name || '';
        for (const line of lines) {
          const material = db.prepare('SELECT id FROM materials WHERE id=? AND is_deleted=0').get(line.material_id);
          if (!material) throw new Error(`Material ${line.material_id} is unavailable.`);
          const current = db.prepare('SELECT quantity FROM stock WHERE godown_id=? AND material_id=?').get(order.godown_id, line.material_id)?.quantity || 0;
          const signed = order.order_type === 'PURCHASE' ? Number(line.quantity) : -Number(line.quantity);
          const updated = Number(current) + signed;
          if (updated < 0) throw new Error(`Insufficient stock for material ${line.material_id}.`);
          db.prepare(`INSERT INTO stock(godown_id,material_id,quantity) VALUES(?,?,?)
            ON CONFLICT(godown_id,material_id) DO UPDATE SET quantity=excluded.quantity,updated_at=CURRENT_TIMESTAMP`)
            .run(order.godown_id, line.material_id, updated);
          if (order.order_type === 'SALES') consumeTrackedLots(order.godown_id, line.material_id, Number(line.quantity));
          const id = `ORD-${order.order_no}-${line.id}`;
          db.prepare(`INSERT INTO stock_transactions(transaction_id,transaction_type,godown_id,material_id,quantity,previous_stock,new_stock,user_id,reference_no,partner_name,reason)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id, order.order_type === 'PURCHASE' ? 'STOCK_IN' : 'STOCK_OUT', order.godown_id,
            line.material_id, line.quantity, current, updated, req.user.id, order.order_no, party, `${order.order_type} order fulfilled`);
          if (order.order_type === 'PURCHASE' && line.lot_code) {
            db.prepare(`INSERT INTO stock_lots(material_id,godown_id,lot_code,shade_code,caliber,expiry_date,quantity) VALUES(?,?,?,?,?,?,?)
              ON CONFLICT(material_id,godown_id,lot_code) DO UPDATE SET quantity=stock_lots.quantity+excluded.quantity,
              shade_code=COALESCE(excluded.shade_code,stock_lots.shade_code),caliber=COALESCE(excluded.caliber,stock_lots.caliber),
              expiry_date=COALESCE(excluded.expiry_date,stock_lots.expiry_date)`)
              .run(line.material_id, order.godown_id, line.lot_code, line.shade_code, line.caliber, line.expiry_date, line.quantity);
          }
        }
        next = order.order_type === 'PURCHASE' ? 'RECEIVED' : 'FULFILLED';
      }
      db.prepare('UPDATE inventory_orders SET status=?,approved_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(next, action === 'approve' ? req.user.id : null, order.id);
    });
    change();
    logAudit(req, `ORDER_${action.toUpperCase()}`, `${order.order_no} ${next.toLowerCase()}.`, 'inventory_orders', order.id);
    res.json({ success: true, status: next });
  } catch (error) { fail(res, error); }
}

function createCount(req, res) {
  try {
    const godownId = Number(req.body.godown_id);
    if (!godownId || (req.user.role === 'supervisor' && godownId !== Number(req.user.assigned_godown_id))) return fail(res, new Error('A permitted warehouse is required.'), 403);
    const result = db.transaction(() => {
      const count = db.prepare('SELECT COUNT(*) n FROM count_sessions').get().n + 1;
      const sessionNo = `CNT-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
      const session = db.prepare('INSERT INTO count_sessions(session_no,godown_id,created_by) VALUES(?,?,?)').run(sessionNo, godownId, req.user.id);
      const inventory = db.prepare(`SELECT m.id material_id,COALESCE(s.quantity,0) expected FROM materials m
        LEFT JOIN stock s ON s.material_id=m.id AND s.godown_id=? WHERE m.is_deleted=0`).all(godownId);
      const add = db.prepare('INSERT INTO count_session_lines(session_id,material_id,expected_quantity) VALUES(?,?,?)');
      for (const row of inventory) add.run(session.lastInsertRowid, row.material_id, row.expected);
      return { id: session.lastInsertRowid, session_no: sessionNo, line_count: inventory.length };
    });
    res.status(201).json({ success: true, session: result() });
  } catch (error) { fail(res, error); }
}

function listCounts(req, res) {
  try {
    const sessions = db.prepare(`SELECT c.*,g.name godown_name,u.name created_by_name FROM count_sessions c
      JOIN godowns g ON g.id=c.godown_id JOIN users u ON u.id=c.created_by
      WHERE (?=1 OR c.godown_id=?) ORDER BY c.created_at DESC LIMIT 100`)
      .all(req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.assigned_godown_id || -1);
    res.json({ success: true, sessions });
  } catch (error) { fail(res, error, 500); }
}

function listLots(req, res) {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const lots = db.prepare(`SELECT l.*,m.name material_name,m.sku,m.unit,g.name godown_name
      FROM stock_lots l JOIN materials m ON m.id=l.material_id JOIN godowns g ON g.id=l.godown_id
      WHERE l.quantity>0 AND (?=1 OR l.godown_id=?) ORDER BY l.created_at DESC LIMIT ? OFFSET ?`)
      .all(['admin','manager'].includes(req.user.role) ? 1 : 0, req.user.assigned_godown_id || -1, limit, offset);
    res.json({ success: true, lots });
  } catch (error) { fail(res, error, 500); }
}

function getCount(req, res) {
  try {
    const session = db.prepare(`SELECT c.*,g.name godown_name FROM count_sessions c JOIN godowns g ON g.id=c.godown_id WHERE c.id=?`).get(req.params.id);
    if (!session) return fail(res, new Error('Count session not found.'), 404);
    if (req.user.role === 'supervisor' && Number(session.godown_id) !== Number(req.user.assigned_godown_id)) return fail(res, new Error('Access denied.'), 403);
    session.lines = db.prepare(`SELECT l.*,m.name material_name,m.sku,m.unit FROM count_session_lines l
      JOIN materials m ON m.id=l.material_id WHERE l.session_id=? ORDER BY m.name`).all(session.id);
    res.json({ success: true, session });
  } catch (error) { fail(res, error, 500); }
}

function updateCountLine(req, res) {
  try {
    const { counted_quantity } = req.body;
    if (!Number.isFinite(Number(counted_quantity)) || Number(counted_quantity) < 0) return fail(res, new Error('Count must be zero or greater.'));
    const result = db.prepare(`UPDATE count_session_lines SET counted_quantity=? WHERE id=? AND session_id IN
      (SELECT id FROM count_sessions WHERE status='DRAFT' AND id=? AND (?=1 OR godown_id=?))`)
      .run(Number(counted_quantity), req.params.lineId, req.params.sessionId,
        ['admin','manager'].includes(req.user.role) ? 1 : 0, req.user.assigned_godown_id || -1);
    if (!result.changes) return fail(res, new Error('Count line not found or session is locked.'), 404);
    res.json({ success: true });
  } catch (error) { fail(res, error); }
}

function submitCount(req, res) {
  try {
    const session = db.prepare('SELECT * FROM count_sessions WHERE id=?').get(req.params.id);
    if (!session || session.status !== 'DRAFT') return fail(res, new Error('Draft count session not found.'), 404);
    if (req.user.role === 'supervisor' && Number(session.godown_id) !== Number(req.user.assigned_godown_id)) return fail(res, new Error('Access denied.'), 403);
    const missing = db.prepare('SELECT COUNT(*) n FROM count_session_lines WHERE session_id=? AND counted_quantity IS NULL').get(session.id).n;
    if (missing) return fail(res, new Error(`Enter all counts before submission (${missing} remaining).`));
    const status = 'PENDING_APPROVAL';
    db.prepare('UPDATE count_sessions SET status=?,reviewed_by=NULL,reviewed_at=NULL WHERE id=?').run(status, session.id);
    res.json({ success: true, status });
  } catch (error) { fail(res, error); }
}

function applyCount(sessionId, reviewerId, req) {
  const apply = db.transaction(() => {
    const session = db.prepare('SELECT * FROM count_sessions WHERE id=?').get(sessionId);
    const lines = db.prepare('SELECT * FROM count_session_lines WHERE session_id=?').all(sessionId);
    for (const line of lines) {
      const current = db.prepare('SELECT quantity FROM stock WHERE godown_id=? AND material_id=?').get(session.godown_id,line.material_id)?.quantity || 0;
      const target = Number(line.counted_quantity), delta = target - Number(current);
      db.prepare(`INSERT INTO stock(godown_id,material_id,quantity) VALUES(?,?,?) ON CONFLICT(godown_id,material_id)
        DO UPDATE SET quantity=excluded.quantity,updated_at=CURRENT_TIMESTAMP`).run(session.godown_id,line.material_id,target);
      if (delta < 0) consumeTrackedLots(session.godown_id, line.material_id, Math.abs(delta));
      if (delta !== 0) {
        db.prepare(`INSERT INTO stock_adjustments(godown_id,material_id,system_stock,physical_stock,adjustment_quantity,reason,user_id) VALUES(?,?,?,?,?,?,?)`)
          .run(session.godown_id,line.material_id,current,target,delta,`Cycle count ${session.session_no}`,reviewerId);
        db.prepare(`INSERT INTO stock_transactions(transaction_id,transaction_type,godown_id,material_id,quantity,previous_stock,new_stock,user_id,reference_no,reason)
          VALUES(?, 'ADJUSTMENT',?,?,?,?,?,?,?,?)`).run(`COUNT-${session.session_no}-${line.material_id}`,
          session.godown_id,line.material_id,Math.abs(delta),current,target,reviewerId,session.session_no,'Approved cycle count');
      }
    }
    db.prepare("UPDATE count_sessions SET status='APPROVED',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").run(reviewerId,sessionId);
  });
  apply();
  if (req) logAudit(req, 'COUNT_APPROVED', `Cycle count ${sessionId} applied.`, 'count_sessions', sessionId);
}

function reviewCount(req, res) {
  try {
    if (!['admin','manager'].includes(req.user.role)) return fail(res, new Error('Manager approval is required.'), 403);
    const session = db.prepare("SELECT * FROM count_sessions WHERE id=? AND status='PENDING_APPROVAL'").get(req.params.id);
    if (!session) return fail(res, new Error('Pending count session not found.'), 404);
    if (Number(session.created_by) === Number(req.user.id)) return fail(res, new Error('A different manager must review this count.'), 403);
    if (req.params.action === 'approve') applyCount(session.id, req.user.id, req);
    else if (req.params.action === 'reject') db.prepare("UPDATE count_sessions SET status='REJECTED',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").run(req.user.id,session.id);
    else return fail(res, new Error('Action must be approve or reject.'));
    res.json({ success: true, status: req.params.action === 'approve' ? 'APPROVED' : 'REJECTED' });
  } catch (error) { fail(res, error); }
}

async function createBackup(req, res) {
  try {
    const directory = path.resolve(__dirname, '../../data/backups');
    fs.mkdirSync(directory, { recursive: true });
    const file = `decostone-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const target = path.join(directory, file);
    await db.backup(target);
    logAudit(req, 'DATABASE_BACKUP', `Database backup created: ${file}`, 'system_settings', file);
    res.download(target, file);
  } catch (error) { fail(res, error, 500); }
}

module.exports = { partyList, createParty, listOrders, createOrder, getOrder, transitionOrder,
  createCount, listCounts, listLots, getCount, updateCountLine, submitCount, reviewCount, createBackup };
