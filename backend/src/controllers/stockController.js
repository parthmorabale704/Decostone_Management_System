const db = require('../db/database');
const stockService = require('../services/stockService');

function handleStockIn(req, res) {
  try {
    const { godownId, materialId, quantity, supplier, referenceNo, remarks } = req.body;

    if (!godownId || !materialId || !quantity) {
      return res.status(400).json({ success: false, message: 'Godown, Material, and Quantity are required.' });
    }

    const result = stockService.stockIn({
      godownId: Number(godownId),
      materialId: Number(materialId),
      quantity: Number(quantity),
      supplier,
      referenceNo,
      remarks,
      user: req.user,
      req
    });

    res.status(200).json({
      success: true,
      message: `Stock IN recorded: ${result.quantityAdded} units of ${result.material} added to ${result.godown}.`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

function handleStockOut(req, res) {
  try {
    const { godownId, materialId, quantity, customer, referenceNo, remarks } = req.body;

    if (!godownId || !materialId || !quantity) {
      return res.status(400).json({ success: false, message: 'Godown, Material, and Quantity are required.' });
    }

    const result = stockService.stockOut({
      godownId: Number(godownId),
      materialId: Number(materialId),
      quantity: Number(quantity),
      customer,
      referenceNo,
      remarks,
      user: req.user,
      req
    });

    res.status(200).json({
      success: true,
      message: `Stock OUT recorded: ${result.quantityRemoved} units of ${result.material} dispatched from ${result.godown}.`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

function handleTransfer(req, res) {
  try {
    const { fromGodownId, toGodownId, materialId, quantity, reason } = req.body;

    if (!fromGodownId || !toGodownId || !materialId || !quantity) {
      return res.status(400).json({ success: false, message: 'Source Godown, Destination Godown, Material, and Quantity are required.' });
    }

    const result = stockService.transferStock({
      fromGodownId: Number(fromGodownId),
      toGodownId: Number(toGodownId),
      materialId: Number(materialId),
      quantity: Number(quantity),
      reason,
      user: req.user,
      req
    });

    res.status(200).json({
      success: true,
      message: `✅ Transfer completed successfully: ${result.quantityTransferred} units transferred from ${result.fromGodown} to ${result.toGodown} [${result.transferId}].`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

function handleAdjustment(req, res) {
  try {
    const { godownId, materialId, physicalStock, reason } = req.body;

    if (!godownId || !materialId || physicalStock === undefined || physicalStock === null) {
      return res.status(400).json({ success: false, message: 'Godown, Material, and Physical Stock count are required.' });
    }

    const result = stockService.adjustStock({
      godownId: Number(godownId),
      materialId: Number(materialId),
      physicalStock: Number(physicalStock),
      reason,
      user: req.user,
      req
    });

    res.status(200).json({
      success: true,
      message: `Stock adjusted for ${result.material} in ${result.godown}: System was ${result.systemStock}, adjusted to ${result.physicalStock} (Diff: ${result.adjustmentQuantity >= 0 ? '+' : ''}${result.adjustmentQuantity}).`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

function getTransactions(req, res) {
  try {
    const { material_id, type, start_date, end_date, search } = req.query;
    const godown_id = req.query.godown_id || req.scopedGodownId;
    const limitValue = Number(req.query.limit ?? 100);
    const offsetValue = Number(req.query.offset ?? 0);
    const safeLimit = Number.isInteger(limitValue) ? Math.min(500, Math.max(1, limitValue)) : 100;
    const safeOffset = Number.isInteger(offsetValue) ? Math.max(0, offsetValue) : 0;

    let query = `
      SELECT st.*, m.name as material_name, m.sku as material_sku, m.unit as material_unit,
             c.name as category_name, g.name as godown_name, u.name as user_name
      FROM stock_transactions st
      JOIN materials m ON st.material_id = m.id
      JOIN categories c ON m.category_id = c.id
      JOIN godowns g ON st.godown_id = g.id
      JOIN users u ON st.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (godown_id) {
      query += ` AND st.godown_id = ?`;
      params.push(godown_id);
    }

    if (material_id) {
      query += ` AND st.material_id = ?`;
      params.push(material_id);
    }

    if (type) {
      query += ` AND st.transaction_type = ?`;
      params.push(type);
    }

    if (start_date) {
      query += ` AND DATE(st.created_at) >= DATE(?)`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(st.created_at) <= DATE(?)`;
      params.push(end_date);
    }

    if (search) {
      query += ` AND (m.name LIKE ? OR m.sku LIKE ? OR st.reference_no LIKE ? OR st.partner_name LIKE ? OR st.transaction_id LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM stock_transactions st/, 'SELECT COUNT(*) AS total FROM stock_transactions st');
    const total = db.prepare(countQuery).get(...params).total;
    query += ` ORDER BY st.created_at DESC, st.id DESC LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const transactions = db.prepare(query).all(...params);

    res.json({ success: true, transactions, count: transactions.length, total, hasMore: safeOffset + transactions.length < total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getTransfers(req, res) {
  try {
    const limitValue = Number(req.query.limit ?? 50);
    const offsetValue = Number(req.query.offset ?? 0);
    const safeLimit = Number.isInteger(limitValue) ? Math.min(500, Math.max(1, limitValue)) : 50;
    const safeOffset = Number.isInteger(offsetValue) ? Math.max(0, offsetValue) : 0;

    const filters = `FROM stock_transfers t WHERE (? = 1 OR t.from_godown_id = ? OR t.to_godown_id = ?)`;
    const args = [req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.assigned_godown_id || -1, req.user.assigned_godown_id || -1];
    const total = db.prepare(`SELECT COUNT(*) total ${filters}`).get(...args).total;
    const transfers = db.prepare(`
      SELECT t.*,
             fg.name as from_godown_name,
             tg.name as to_godown_name,
             m.name as material_name,
             m.sku as material_sku,
             m.unit as material_unit,
             u.name as user_name
      FROM stock_transfers t
      JOIN godowns fg ON t.from_godown_id = fg.id
      JOIN godowns tg ON t.to_godown_id = tg.id
      JOIN materials m ON t.material_id = m.id
      JOIN users u ON t.user_id = u.id
      WHERE (? = 1 OR t.from_godown_id = ? OR t.to_godown_id = ?)
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.assigned_godown_id || -1, req.user.assigned_godown_id || -1, safeLimit, safeOffset);

    res.json({ success: true, transfers, total, hasMore: safeOffset + transfers.length < total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getAdjustments(req, res) {
  try {
    const limitValue = Number(req.query.limit ?? 100);
    const offsetValue = Number(req.query.offset ?? 0);
    const safeLimit = Number.isInteger(limitValue) ? Math.min(500, Math.max(1, limitValue)) : 100;
    const safeOffset = Number.isInteger(offsetValue) ? Math.max(0, offsetValue) : 0;
    const scope = [req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.assigned_godown_id || -1];
    const total = db.prepare('SELECT COUNT(*) total FROM stock_adjustments a WHERE (?=1 OR a.godown_id=?)').get(...scope).total;
    const adjustments = db.prepare(`
      SELECT a.*,
             g.name as godown_name,
             m.name as material_name,
             m.sku as material_sku,
             m.unit as material_unit,
             u.name as user_name
      FROM stock_adjustments a
      JOIN godowns g ON a.godown_id = g.id
      JOIN materials m ON a.material_id = m.id
      JOIN users u ON a.user_id = u.id
      WHERE (? = 1 OR a.godown_id = ?)
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...scope, safeLimit, safeOffset);

    res.json({ success: true, adjustments, total, hasMore: safeOffset + adjustments.length < total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getLowStockAlerts(req, res) {
  try {
    const lowStockItems = db.prepare(`
      SELECT s.godown_id, s.material_id, s.quantity as current_stock,
             g.name as godown_name,
             m.name as material_name, m.sku, m.unit, m.min_stock_level, m.purchase_price,
             c.name as category_name
      FROM stock s
      JOIN godowns g ON s.godown_id = g.id
      JOIN materials m ON s.material_id = m.id
      JOIN categories c ON m.category_id = c.id
      WHERE m.is_deleted = 0 AND s.quantity <= m.min_stock_level
        AND (? = 1 OR s.godown_id = ?)
      ORDER BY s.quantity ASC
    `).all(req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.assigned_godown_id || -1);

    res.json({ success: true, lowStockItems, count: lowStockItems.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  handleStockIn,
  handleStockOut,
  handleTransfer,
  handleAdjustment,
  getTransactions,
  getTransfers,
  getAdjustments,
  getLowStockAlerts
};
