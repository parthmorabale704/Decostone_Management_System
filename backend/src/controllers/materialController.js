const db = require('../db/database');
const { logAudit } = require('../services/auditService');

function getAllMaterials(req, res) {
  try {
    const { search, category_id, stock_status, brand } = req.query;
    const godown_id = req.query.godown_id || req.scopedGodownId;
    const selectedGodownId = godown_id ? Number(godown_id) : null;
    const allGodowns = req.user.role !== 'supervisor';
    const limitValue = Number(req.query.limit ?? 100);
    const offsetValue = Number(req.query.offset ?? 0);
    const safeLimit = Number.isInteger(limitValue) ? Math.min(500, Math.max(1, limitValue)) : 100;
    const safeOffset = Number.isInteger(offsetValue) ? Math.max(0, offsetValue) : 0;

    let query = `
      SELECT m.*, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        (SELECT json_group_array(json_object('godown_id', g.id, 'godown_name', g.name, 'quantity', COALESCE(stk.quantity, 0)))
         FROM godowns g
         LEFT JOIN stock stk ON stk.godown_id = g.id AND stk.material_id = m.id
         WHERE g.is_active = 1 AND (? IS NULL OR g.id = ?) AND (? = 1 OR g.id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
        ) as godown_stocks
      FROM materials m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock s ON s.material_id = m.id AND (? IS NULL OR s.godown_id = ?) AND (? = 1 OR s.godown_id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
      WHERE m.is_deleted = 0
    `;

    const params = [selectedGodownId, selectedGodownId, allGodowns ? 1 : 0, req.user.id,
      selectedGodownId, selectedGodownId, allGodowns ? 1 : 0, req.user.id];

    if (search) {
      query += ` AND (m.name LIKE ? OR m.sku LIKE ? OR m.barcode LIKE ? OR m.brand LIKE ? OR m.size LIKE ? OR m.color LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    if (category_id) {
      query += ` AND m.category_id = ?`;
      params.push(category_id);
    }

    if (brand) {
      query += ` AND m.brand = ?`;
      params.push(brand);
    }

    query += ` GROUP BY m.id`;

    if (stock_status) {
      if (stock_status === 'OUT_OF_STOCK') {
        query += ` HAVING total_stock = 0`;
      } else if (stock_status === 'LOW_STOCK') {
        query += ` HAVING total_stock > 0 AND total_stock <= m.min_stock_level`;
      } else if (stock_status === 'IN_STOCK') {
        query += ` HAVING total_stock > m.min_stock_level`;
      }
    }

    const countQuery = `SELECT COUNT(*) as count FROM (${query}) AS filtered_materials`;
    const total = db.prepare(countQuery).get(...params).count;
    query += ` ORDER BY m.name ASC LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const rows = db.prepare(query).all(...params);

    const materials = rows.map(r => {
      let godownStocks = [];
      try {
        godownStocks = JSON.parse(r.godown_stocks);
      } catch (e) {}

      let status = 'IN_STOCK';
      if (r.total_stock === 0) status = 'OUT_OF_STOCK';
      else if (r.total_stock <= r.min_stock_level) status = 'LOW_STOCK';

      return {
        ...r,
        godown_stocks: godownStocks,
        stock_status: status
      };
    });

    res.json({ success: true, materials, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getMaterialById(req, res) {
  try {
    const { id } = req.params;
    const selectedGodownId = req.query.godown_id || req.scopedGodownId
      ? Number(req.query.godown_id || req.scopedGodownId)
      : null;
    const allGodowns = req.user.role !== 'supervisor';
    const material = db.prepare(`
      SELECT m.*, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM materials m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock s ON s.material_id = m.id AND (? IS NULL OR s.godown_id = ?) AND (? = 1 OR s.godown_id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
      WHERE m.id = ? AND m.is_deleted = 0
      GROUP BY m.id
    `).get(selectedGodownId, selectedGodownId, allGodowns ? 1 : 0, req.user.id, id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const godownsStock = db.prepare(`
      SELECT g.id as godown_id, g.name as godown_name, g.code as godown_code,
             COALESCE(s.quantity, 0) as quantity,
             CASE
               WHEN COALESCE(s.quantity, 0) = 0 THEN 'OUT_OF_STOCK'
               WHEN COALESCE(s.quantity, 0) <= ? THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status
      FROM godowns g
      LEFT JOIN stock s ON s.godown_id = g.id AND s.material_id = ?
      WHERE g.is_active = 1 AND (? IS NULL OR g.id = ?) AND (? = 1 OR g.id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
      ORDER BY g.id ASC
    `).all(material.min_stock_level, id, selectedGodownId, selectedGodownId, allGodowns ? 1 : 0, req.user.id);

    const movementHistory = db.prepare(`
      SELECT st.*, g.name as godown_name, u.name as user_name
      FROM stock_transactions st
      JOIN godowns g ON st.godown_id = g.id
      JOIN users u ON st.user_id = u.id
      WHERE st.material_id = ? AND (? IS NULL OR st.godown_id = ?) AND (? = 1 OR st.godown_id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
      ORDER BY st.created_at DESC
      LIMIT 50
    `).all(id, selectedGodownId, selectedGodownId, allGodowns ? 1 : 0, req.user.id);

    const images = db.prepare('SELECT * FROM material_images WHERE material_id = ?').all(id);

    res.json({
      success: true,
      material: {
        ...material,
        godownsStock,
        movementHistory,
        images
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function createMaterial(req, res) {
  try {
    const {
      sku, barcode, name, category_id, brand, description, size, color, unit,
      purchase_price = 0, selling_price = 0, min_stock_level = 10,
      image_url, opening_stocks = {}
    } = req.body;

    if (!sku || !name || !category_id || !unit) {
      return res.status(400).json({ success: false, message: 'SKU, name, category, and unit are required fields.' });
    }
    const purchasePrice = Number(purchase_price);
    const sellingPrice = Number(selling_price);
    const minimumStock = Number(min_stock_level);
    if (![purchasePrice, sellingPrice, minimumStock].every(Number.isFinite) || purchasePrice < 0 || sellingPrice < 0 || minimumStock < 0) {
      return res.status(400).json({ success: false, message: 'Prices and minimum stock level must be valid non-negative numbers.' });
    }
    if (!Number.isInteger(Number(category_id)) || !db.prepare('SELECT 1 FROM categories WHERE id = ? AND is_deleted = 0').get(Number(category_id))) {
      return res.status(400).json({ success: false, message: 'The selected category does not exist.' });
    }
    if (!opening_stocks || typeof opening_stocks !== 'object' || Array.isArray(opening_stocks)) {
      return res.status(400).json({ success: false, message: 'Opening stock must be provided as a warehouse-to-quantity map.' });
    }
    if (Object.values(opening_stocks).some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      return res.status(400).json({ success: false, message: 'Opening stock quantities must be valid non-negative numbers.' });
    }

    const transaction = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO materials (sku, barcode, name, category_id, brand, description, size, color, unit, purchase_price, selling_price, min_stock_level, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = insert.run(
        sku.trim().toUpperCase(),
        barcode ? barcode.trim() : null,
        name.trim(),
        Number(category_id),
        brand ? brand.trim() : null,
        description ? description.trim() : null,
        size ? size.trim() : null,
        color ? color.trim() : null,
        unit.trim(),
        purchasePrice,
        sellingPrice,
        minimumStock,
        image_url || null
      );

      const materialId = info.lastInsertRowid;

      // Handle opening stock for each godown
      const godowns = db.prepare('SELECT id, name FROM godowns WHERE is_active = 1').all();
      const insertStock = db.prepare('INSERT INTO stock (godown_id, material_id, quantity) VALUES (?, ?, ?)');
      const insertTxn = db.prepare(`
        INSERT INTO stock_transactions
        (transaction_id, transaction_type, godown_id, material_id, quantity, previous_stock, new_stock, user_id, reference_no, reason)
        VALUES (?, 'OPENING_STOCK', ?, ?, ?, 0, ?, ?, 'INITIAL-SETUP', 'Initial opening stock')
      `);

      for (const g of godowns) {
        const qty = Number(opening_stocks[g.id] || 0);
        insertStock.run(g.id, materialId, qty);

        if (qty > 0) {
          const txnId = `TXN-INIT-${materialId}-${g.id}`;
          insertTxn.run(txnId, g.id, materialId, qty, qty, req.user.id);
        }
      }

      logAudit(req, 'CREATE_MATERIAL', `Added new material "${name}" (SKU: ${sku})`, 'materials', materialId);

      return materialId;
    });

    const newMaterialId = transaction();

    res.status(201).json({
      success: true,
      message: 'Material created successfully with warehouse stock initialized.',
      materialId: newMaterialId
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'A material with this SKU/Code already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function updateMaterial(req, res) {
  try {
    const { id } = req.params;
    const {
      sku, barcode, name, category_id, brand, description, size, color, unit,
      purchase_price, selling_price, min_stock_level, image_url
    } = req.body;

    if (!sku || !name || !category_id || !unit) {
      return res.status(400).json({ success: false, message: 'SKU, name, category, and unit are required.' });
    }
    const purchasePrice = Number(purchase_price ?? 0);
    const sellingPrice = Number(selling_price ?? 0);
    const minimumStock = Number(min_stock_level ?? 10);
    if (![purchasePrice, sellingPrice, minimumStock].every(Number.isFinite) || purchasePrice < 0 || sellingPrice < 0 || minimumStock < 0) {
      return res.status(400).json({ success: false, message: 'Prices and minimum stock level must be valid non-negative numbers.' });
    }
    if (!Number.isInteger(Number(category_id)) || !db.prepare('SELECT 1 FROM categories WHERE id = ? AND is_deleted = 0').get(Number(category_id))) {
      return res.status(400).json({ success: false, message: 'The selected category does not exist.' });
    }

    const existingMaterial = db.prepare('SELECT id FROM materials WHERE id = ? AND is_deleted = 0').get(id);
    if (!existingMaterial) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    db.prepare(`
      UPDATE materials
      SET sku = ?, barcode = ?, name = ?, category_id = ?, brand = ?, description = ?,
          size = ?, color = ?, unit = ?, purchase_price = ?, selling_price = ?,
          min_stock_level = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      sku.trim().toUpperCase(),
      barcode ? barcode.trim() : null,
      name.trim(),
      Number(category_id),
      brand ? brand.trim() : null,
      description ? description.trim() : null,
      size ? size.trim() : null,
      color ? color.trim() : null,
      unit.trim(),
      purchasePrice,
      sellingPrice,
      minimumStock,
      image_url || null,
      id
    );

    logAudit(req, 'UPDATE_MATERIAL', `Updated material ID ${id} (${name})`, 'materials', id);

    res.json({ success: true, message: 'Material updated successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'Another material with this SKU already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function deleteMaterial(req, res) {
  try {
    const { id } = req.params;
    const material = db.prepare('SELECT id FROM materials WHERE id = ? AND is_deleted = 0').get(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }
    const stocked = db.prepare('SELECT COALESCE(SUM(quantity), 0) as quantity FROM stock WHERE material_id = ?').get(id);
    if (Number(stocked.quantity) > 0) {
      return res.status(409).json({
        success: false,
        message: 'This material still has stock on hand. Transfer or adjust all warehouse stock to zero before deleting it.'
      });
    }
    // Soft delete to preserve historical stock records and audit trails
    db.prepare('UPDATE materials SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logAudit(req, 'DELETE_MATERIAL', `Soft-deleted material ID ${id}`, 'materials', id);

    res.json({ success: true, message: 'Material marked as deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial
};
