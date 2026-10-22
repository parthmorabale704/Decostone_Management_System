const db = require('../db/database');
const { logAudit } = require('../services/auditService');

function getAllGodowns(req, res) {
  try {
    const godowns = db.prepare(`
      SELECT g.*,
        COALESCE((
          SELECT COUNT(DISTINCT s.material_id)
          FROM stock s
          JOIN materials m ON m.id = s.material_id
          WHERE s.godown_id = g.id AND s.quantity > 0 AND m.is_deleted = 0
        ), 0) as total_materials,
        COALESCE((
          SELECT SUM(s.quantity)
          FROM stock s
          JOIN materials m ON m.id = s.material_id
          WHERE s.godown_id = g.id AND m.is_deleted = 0
        ), 0) as total_stock_qty,
        COALESCE((
          SELECT COUNT(*)
          FROM stock s
          JOIN materials m ON s.material_id = m.id
          WHERE s.godown_id = g.id AND m.is_deleted = 0 AND s.quantity <= m.min_stock_level
        ), 0) as low_stock_count
      FROM godowns g
      WHERE (? = 1 OR g.id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
      ORDER BY g.id ASC
    `).all(req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.id);

    // If supervisor, optionally mark or filter
    res.json({ success: true, godowns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getGodownById(req, res) {
  try {
    const { id } = req.params;
    const godown = db.prepare('SELECT * FROM godowns WHERE id = ?').get(id);

    if (!godown) {
      return res.status(404).json({ success: false, message: 'Godown not found.' });
    }

    const inventory = db.prepare(`
      SELECT m.id as material_id, m.name as material_name, m.sku, m.brand, m.size, m.color, m.unit,
             m.purchase_price, m.selling_price, m.min_stock_level, m.image_url,
             c.id as category_id, c.name as category_name,
             COALESCE(s.quantity, 0) as quantity,
             CASE
               WHEN COALESCE(s.quantity, 0) = 0 THEN 'OUT_OF_STOCK'
               WHEN COALESCE(s.quantity, 0) <= m.min_stock_level THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status
      FROM materials m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock s ON s.material_id = m.id AND s.godown_id = ?
      WHERE m.is_deleted = 0
      ORDER BY m.name ASC
    `).all(id);

    const stats = {
      totalMaterials: inventory.filter(i => i.quantity > 0).length,
      totalQuantity: inventory.reduce((acc, curr) => acc + curr.quantity, 0),
      lowStockCount: inventory.filter(i => i.stock_status === 'LOW_STOCK' || i.stock_status === 'OUT_OF_STOCK').length,
      inventoryValue: inventory.reduce((acc, curr) => acc + (curr.quantity * curr.purchase_price), 0)
    };

    const recentTransactions = db.prepare(`
      SELECT st.*, m.name as material_name, m.sku, u.name as user_name
      FROM stock_transactions st
      JOIN materials m ON st.material_id = m.id
      JOIN users u ON st.user_id = u.id
      WHERE st.godown_id = ?
      ORDER BY st.created_at DESC
      LIMIT 10
    `).all(id);

    res.json({
      success: true,
      godown,
      stats,
      inventory,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function createGodown(req, res) {
  try {
    const { name, code, location, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Godown name is required.' });
    }

    const info = db.prepare(`
      INSERT INTO godowns (name, code, location, description)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), code || null, location || null, description || null);

    logAudit(req, 'CREATE_GODOWN', `Created new godown "${name}" (ID: ${info.lastInsertRowid})`, 'godowns', info.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Godown created successfully.',
      godownId: info.lastInsertRowid
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'A godown with this name already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function updateGodown(req, res) {
  try {
    const { id } = req.params;
    const { name, code, location, description, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Godown name is required.' });
    }

    const existing = db.prepare('SELECT id FROM godowns WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Godown not found.' });
    }

    db.prepare(`
      UPDATE godowns
      SET name = ?, code = ?, location = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name.trim(), code || null, location || null, description || null, is_active !== undefined ? is_active : 1, id);

    logAudit(req, 'UPDATE_GODOWN', `Updated godown ID ${id}: name "${name}"`, 'godowns', id);

    res.json({ success: true, message: 'Godown updated successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'A godown with this name already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllGodowns,
  getGodownById,
  createGodown,
  updateGodown
};
