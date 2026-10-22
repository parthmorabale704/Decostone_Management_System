const db = require('../db/database');
const { logAudit } = require('../services/auditService');

function getAllCategories(req, res) {
  try {
    const categories = db.prepare(`
      SELECT c.*,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 THEN m.id END) as total_materials,
        COUNT(DISTINCT m.id) as total_material_records,
        COALESCE((
          SELECT SUM(l.quantity)
          FROM stock_lots l
          JOIN materials lm ON lm.id = l.material_id
          WHERE lm.category_id = c.id
            AND (? = 1 OR l.godown_id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
        ), 0) as total_lot_quantity,
        COALESCE(SUM(s.quantity), 0) as total_stock_quantity
      FROM categories c
      LEFT JOIN materials m ON m.category_id = c.id
      LEFT JOIN stock s ON s.material_id = m.id
        AND (? = 1 OR s.godown_id IN (SELECT godown_id FROM user_godowns WHERE user_id = ?))
      WHERE c.is_deleted = 0
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all(
      req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0,
      req.user.id,
      req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0,
      req.user.id
    );

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function createCategory(req, res) {
  try {
    const { name, description, image_url } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = db.prepare('SELECT id, is_deleted FROM categories WHERE name = ? COLLATE NOCASE').get(name.trim());
    if (existing?.is_deleted) {
      db.prepare(`UPDATE categories SET name = ?, description = ?, image_url = ?, is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(name.trim(), description || null, image_url || null, existing.id);
      logAudit(req, 'RESTORE_CATEGORY', `Restored category "${name}" (ID: ${existing.id})`, 'categories', existing.id);
      return res.status(200).json({ success: true, message: 'Category restored successfully.', categoryId: existing.id });
    }

    const info = db.prepare(`
      INSERT INTO categories (name, description, image_url)
      VALUES (?, ?, ?)
    `).run(name.trim(), description || null, image_url || null);

    logAudit(req, 'CREATE_CATEGORY', `Created category "${name}" (ID: ${info.lastInsertRowid})`, 'categories', info.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      categoryId: info.lastInsertRowid
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function createCategoriesBulk(req, res) {
  try {
    const names = Array.isArray(req.body?.names) ? req.body.names : [];
    const normalized = [...new Set(names.map(name => String(name || '').trim()).filter(Boolean))];
    if (!normalized.length) {
      return res.status(400).json({ success: false, message: 'Enter at least one category name.' });
    }
    if (normalized.length > 100) {
      return res.status(400).json({ success: false, message: 'You can add up to 100 categories at a time.' });
    }
    if (normalized.some(name => name.length > 120)) {
      return res.status(400).json({ success: false, message: 'Category names must be 120 characters or fewer.' });
    }

    const insert = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const created = [];
    const skipped = [];
    const addCategories = db.transaction(() => {
      for (const name of normalized) {
        const exists = db.prepare('SELECT id, is_deleted FROM categories WHERE name = ? COLLATE NOCASE').get(name);
        if (exists?.is_deleted) {
          db.prepare('UPDATE categories SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(exists.id);
          created.push({ id: Number(exists.id), name, restored: true });
          continue;
        }
        if (exists) {
          skipped.push(name);
          continue;
        }
        const result = insert.run(name);
        created.push({ id: Number(result.lastInsertRowid), name });
      }
    });
    addCategories();

    if (created.length) {
      logAudit(req, 'BULK_CREATE_CATEGORIES', `Created ${created.length} categories: ${created.map(item => item.name).join(', ')}`, 'categories', created.map(item => item.id).join(','));
    }
    res.status(201).json({ success: true, created, skipped, message: `${created.length} category(s) added${skipped.length ? `; ${skipped.length} existing name(s) skipped` : ''}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function replaceAllCategories(req, res) {
  try {
    const { name, description, image_url } = req.body || {};
    const replacementName = String(name || '').trim();
    if (!replacementName) {
      return res.status(400).json({ success: false, message: 'A replacement category name is required.' });
    }
    if (replacementName.length > 120) {
      return res.status(400).json({ success: false, message: 'Category names must be 120 characters or fewer.' });
    }

    const currentCount = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE is_deleted = 0').get().count;
    if (!currentCount) {
      return res.status(400).json({ success: false, message: 'There are no existing categories to replace.' });
    }
    if (db.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND is_deleted = 0').get(replacementName)) {
      return res.status(409).json({ success: false, message: 'Choose a new name that is different from the existing categories.' });
    }

    const replace = db.transaction(() => {
      const created = db.prepare('INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)')
        .run(replacementName, description || null, image_url || null);
      const replacementId = Number(created.lastInsertRowid);
      const reassigned = db.prepare('UPDATE materials SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id IN (SELECT id FROM categories WHERE id != ?)')
        .run(replacementId, replacementId).changes;
      const deleted = db.prepare('UPDATE categories SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id != ? AND is_deleted = 0').run(replacementId).changes;
      return { replacementId, reassigned, deleted };
    });
    const result = replace();

    logAudit(req, 'REPLACE_ALL_CATEGORIES', `Replaced ${result.deleted} categories with "${replacementName}" and reassigned ${result.reassigned} material record(s).`, 'categories', result.replacementId);
    res.json({
      success: true,
      categoryId: result.replacementId,
      deleted_count: result.deleted,
      reassigned_materials: result.reassigned,
      message: `Replaced ${result.deleted} categories. ${result.reassigned} material record(s) moved to "${replacementName}".`
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, message: 'That replacement category name already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = db.prepare('SELECT id FROM categories WHERE id = ? AND is_deleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, description = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name.trim(), description || null, image_url || null, id);

    logAudit(req, 'UPDATE_CATEGORY', `Updated category ID ${id} to "${name}"`, 'categories', id);

    res.json({ success: true, message: 'Category updated successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const category = db.prepare('SELECT id, name FROM categories WHERE id = ? AND is_deleted = 0').get(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    const usage = db.prepare(`
      SELECT COUNT(*) AS material_records,
             COUNT(CASE WHEN is_deleted = 0 THEN 1 END) AS active_materials,
             COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE material_id = materials.id)), 0) AS stock_units,
             COALESCE(SUM((SELECT COALESCE(SUM(quantity), 0) FROM stock_lots WHERE material_id = materials.id)), 0) AS lot_units
      FROM materials WHERE category_id = ?
    `).get(id);

    if (Number(usage.stock_units) !== 0 || Number(usage.lot_units) !== 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete this category while it has stock (${Number(usage.stock_units)} units in warehouse balances and ${Number(usage.lot_units)} units in tracked lots). Move or dispatch the stock first.`,
        active_materials: usage.active_materials,
        stock_units: usage.stock_units,
        lot_stock_units: usage.lot_units
      });
    }

    const removeCategory = db.transaction(() => {
      // Preserve category/material foreign keys for historical transactions while
      // removing zero-stock materials and this category from active catalog views.
      db.prepare('UPDATE materials SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE category_id = ? AND is_deleted = 0').run(id);
      db.prepare('UPDATE categories SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    });
    removeCategory();

    const auditAction = usage.material_records > 0 ? 'ARCHIVE_DELETE_CATEGORY' : 'DELETE_CATEGORY';
    const detail = `Removed category "${category.name}" from the active catalog, archived ${usage.active_materials} active material(s), and retained ${usage.material_records} material record(s) for history.`;
    logAudit(req, auditAction, detail, 'categories', id);

    res.json({
      success: true,
      message: 'Category removed successfully. Its historical material and transaction records were preserved.',
      archived_materials: Number(usage.active_materials),
      deleted_category_id: Number(id)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  createCategoriesBulk,
  replaceAllCategories,
  updateCategory,
  deleteCategory
};
