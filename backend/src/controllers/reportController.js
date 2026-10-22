const db = require('../db/database');

function getDashboardSummary(req, res) {
  try {
    const allGodowns = req.user.role === 'admin' || req.user.role === 'manager';
    const assignedGodownId = req.user.assigned_godown_id || -1;
    const totalMaterials = db.prepare('SELECT COUNT(*) as count FROM materials WHERE is_deleted = 0').get().count;
    const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_deleted = 0').get().count;
    const totalStock = db.prepare(`
      SELECT COALESCE(SUM(s.quantity), 0) as total_qty,
             COALESCE(SUM(s.quantity * m.purchase_price), 0) as total_value
      FROM stock s
      JOIN materials m ON s.material_id = m.id
      WHERE m.is_deleted = 0 AND (? = 1 OR s.godown_id = ?)
    `).get(allGodowns ? 1 : 0, assignedGodownId);

    // Godown breakdown
    const godowns = db.prepare(`
      SELECT g.id, g.name, g.code,
        COALESCE(SUM(CASE WHEN m.is_deleted = 0 THEN s.quantity ELSE 0 END), 0) as total_stock,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 AND s.quantity > 0 THEN s.material_id END) as active_materials
      FROM godowns g
      LEFT JOIN stock s ON s.godown_id = g.id
      LEFT JOIN materials m ON s.material_id = m.id AND m.is_deleted = 0
      WHERE g.is_active = 1 AND (? = 1 OR g.id = ?)
      GROUP BY g.id
      ORDER BY g.id ASC
    `).all(allGodowns ? 1 : 0, assignedGodownId);

    // Low stock count (distinct materials where total stock <= min_stock_level)
    const lowStockMaterials = db.prepare(`
      SELECT m.id, m.name, m.sku, m.min_stock_level, m.unit, c.name as category_name,
             COUNT(*) OVER() as total_low_stock_count,
             COALESCE(SUM(s.quantity), 0) as total_stock
      FROM materials m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock s ON s.material_id = m.id AND (? = 1 OR s.godown_id = ?)
      WHERE m.is_deleted = 0
      GROUP BY m.id
      HAVING total_stock <= m.min_stock_level
      ORDER BY total_stock ASC
      LIMIT 10
    `).all(allGodowns ? 1 : 0, assignedGodownId);

    // Today's stats
    const todayStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'STOCK_IN' THEN quantity ELSE 0 END), 0) as today_in_qty,
        COALESCE(COUNT(CASE WHEN transaction_type = 'STOCK_IN' THEN 1 END), 0) as today_in_txns,
        COALESCE(SUM(CASE WHEN transaction_type = 'STOCK_OUT' THEN quantity ELSE 0 END), 0) as today_out_qty,
        COALESCE(COUNT(CASE WHEN transaction_type = 'STOCK_OUT' THEN 1 END), 0) as today_out_txns,
        COALESCE(SUM(CASE WHEN ${allGodowns ? "transaction_type = 'TRANSFER_IN'" : "transaction_type IN ('TRANSFER_IN', 'TRANSFER_OUT')"} THEN quantity ELSE 0 END), 0) as today_transfer_qty,
        COALESCE(COUNT(CASE WHEN ${allGodowns ? "transaction_type = 'TRANSFER_IN'" : "transaction_type IN ('TRANSFER_IN', 'TRANSFER_OUT')"} THEN 1 END), 0) as today_transfer_txns
      FROM stock_transactions
      WHERE DATE(created_at) = DATE('now', 'localtime') AND (? = 1 OR godown_id = ?)
    `).get(allGodowns ? 1 : 0, assignedGodownId);

    // Category distribution for charts
    const categoryDistribution = db.prepare(`
      SELECT c.name, COALESCE(SUM(s.quantity), 0) as total_stock
      FROM categories c
      LEFT JOIN materials m ON m.category_id = c.id AND m.is_deleted = 0
      LEFT JOIN stock s ON s.material_id = m.id AND (? = 1 OR s.godown_id = ?)
      WHERE c.is_deleted = 0
      GROUP BY c.id
      ORDER BY total_stock DESC
    `).all(allGodowns ? 1 : 0, assignedGodownId);

    // Monthly movement / Last 7 days IN vs OUT
    const movementTrends = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', created_at) as date,
        SUM(CASE WHEN transaction_type = 'STOCK_IN' THEN quantity ELSE 0 END) as stock_in,
        SUM(CASE WHEN transaction_type = 'STOCK_OUT' THEN quantity ELSE 0 END) as stock_out,
        SUM(CASE WHEN ${allGodowns ? "transaction_type = 'TRANSFER_IN'" : "transaction_type IN ('TRANSFER_IN', 'TRANSFER_OUT')"} THEN quantity ELSE 0 END) as transfers
      FROM stock_transactions
      WHERE created_at >= DATE('now', '-30 days') AND (? = 1 OR godown_id = ?)
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date ASC
    `).all(allGodowns ? 1 : 0, assignedGodownId);

    // Recent 10 transactions
    const recentTransactions = db.prepare(`
      SELECT st.*, m.name as material_name, m.sku, m.unit, g.name as godown_name, u.name as user_name
      FROM stock_transactions st
      JOIN materials m ON st.material_id = m.id
      JOIN godowns g ON st.godown_id = g.id
      JOIN users u ON st.user_id = u.id
      WHERE (? = 1 OR st.godown_id = ?)
      ORDER BY st.created_at DESC
      LIMIT 10
    `).all(allGodowns ? 1 : 0, assignedGodownId);

    res.json({
      success: true,
      summary: {
        totalMaterials,
        totalCategories,
        totalStockQty: totalStock.total_qty,
        totalInventoryValue: totalStock.total_value,
        godowns,
        lowStockCount: lowStockMaterials[0]?.total_low_stock_count || 0,
        lowStockMaterials,
        todayStats,
        categoryDistribution,
        movementTrends,
        recentTransactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getGodownWiseReport(req, res) {
  try {
    const report = db.prepare(`
      SELECT g.id as godown_id, g.name as godown_name, g.code as godown_code,
             m.id as material_id, m.name as material_name, m.sku, m.unit, m.min_stock_level,
             c.name as category_name,
             COALESCE(s.quantity, 0) as current_stock,
             (COALESCE(s.quantity, 0) * m.purchase_price) as stock_valuation
      FROM godowns g
      CROSS JOIN materials m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock s ON s.godown_id = g.id AND s.material_id = m.id
      WHERE g.is_active = 1 AND m.is_deleted = 0
      ORDER BY g.name ASC, m.name ASC
    `).all();

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getCategoryWiseReport(req, res) {
  try {
    const report = db.prepare(`
      SELECT c.id as category_id, c.name as category_name,
             COUNT(DISTINCT m.id) as material_count,
             COALESCE(SUM(s.quantity), 0) as total_quantity,
             COALESCE(SUM(s.quantity * m.purchase_price), 0) as total_valuation
      FROM categories c
      LEFT JOIN materials m ON m.category_id = c.id AND m.is_deleted = 0
      LEFT JOIN stock s ON s.material_id = m.id
      WHERE c.is_deleted = 0
      GROUP BY c.id
      ORDER BY total_quantity DESC
    `).all();

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getMaterialMovementReport(req, res) {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT m.id, m.name as material_name, m.sku, m.unit, c.name as category_name,
             COALESCE(SUM(CASE WHEN st.transaction_type = 'STOCK_IN' THEN st.quantity ELSE 0 END), 0) as total_in,
             COALESCE(SUM(CASE WHEN st.transaction_type = 'STOCK_OUT' THEN st.quantity ELSE 0 END), 0) as total_out,
             COALESCE(SUM(CASE WHEN st.transaction_type = 'TRANSFER_IN' THEN st.quantity ELSE 0 END), 0) as total_transferred,
             COALESCE(SUM(CASE WHEN st.transaction_type = 'ADJUSTMENT' THEN st.quantity ELSE 0 END), 0) as total_adjusted,
             (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE material_id = m.id) as current_stock
      FROM materials m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock_transactions st ON st.material_id = m.id
    `;

    const params = [];
    if (start_date) {
      query += ` AND DATE(st.created_at) >= DATE(?)`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(st.created_at) <= DATE(?)`;
      params.push(end_date);
    }

    query += ` WHERE m.is_deleted = 0 GROUP BY m.id ORDER BY (total_in + total_out) DESC`;

    const report = db.prepare(query).all(...params);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getUserActivityReport(req, res) {
  try {
    const report = db.prepare(`
      SELECT u.id, u.name, u.username, u.role,
             COUNT(DISTINCT st.id) as transactions_performed,
             COUNT(DISTINCT al.id) as audit_actions_logged,
             MAX(al.created_at) as last_active_at
      FROM users u
      LEFT JOIN stock_transactions st ON st.user_id = u.id
      LEFT JOIN audit_logs al ON al.user_id = u.id
      GROUP BY u.id
      ORDER BY transactions_performed DESC
    `).all();

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDashboardSummary,
  getGodownWiseReport,
  getCategoryWiseReport,
  getMaterialMovementReport,
  getUserActivityReport
};
