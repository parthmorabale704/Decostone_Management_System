const db = require('../db/database');
const { logAudit } = require('../services/auditService');

function getAllCategories(req, res) {
  try {
    const categories = db.prepare(`
      SELECT c.*,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 THEN m.id END) as total_materials,
        COALESCE(SUM(CASE WHEN m.is_deleted = 0 THEN s.quantity ELSE 0 END), 0) as total_stock_quantity
      FROM categories c
      LEFT JOIN materials m ON m.category_id = c.id
      LEFT JOIN stock s ON s.material_id = m.id
        AND (? = 1 OR s.godown_id = ?)
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all(req.user.role === 'admin' || req.user.role === 'manager' ? 1 : 0, req.user.assigned_godown_id || -1);

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

function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
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
    const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    const materialsCount = db.prepare('SELECT COUNT(*) as count FROM materials WHERE category_id = ?').get(id).count;

    if (materialsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: it is referenced by ${materialsCount} material record(s).`
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    logAudit(req, 'DELETE_CATEGORY', `Deleted category "${category.name}"`, 'categories', id);

    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
