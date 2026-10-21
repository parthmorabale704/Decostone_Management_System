const db = require('../db/database');
const { logAudit } = require('../services/auditService');

function getAuditLogs(req, res) {
  try {
    const { action, role, user_id, start_date, end_date, search, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }

    if (start_date) {
      query += ' AND DATE(created_at) >= DATE(?)';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(created_at) <= DATE(?)';
      params.push(end_date);
    }

    if (search) {
      query += ' AND (user_name LIKE ? OR action LIKE ? OR details LIKE ? OR affected_table LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countParams = [...params];
    const safeLimit = Number.isInteger(Number(limit)) ? Math.min(500, Math.max(1, Number(limit))) : 100;
    const safeOffset = Number.isInteger(Number(offset)) ? Math.max(0, Number(offset)) : 0;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);

    const logs = db.prepare(query).all(...params);
    const totalCount = db.prepare(countQuery).get(...countParams).count;

    res.json({ success: true, logs, total: totalCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function getSettings(req, res) {
  try {
    const settings = db.prepare('SELECT * FROM system_settings').all();
    const map = {};
    settings.forEach(s => {
      map[s.key] = s.value;
    });
    res.json({ success: true, settings: map, raw: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function updateSettings(req, res) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object is required.' });
    }

    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    db.transaction(() => {
      for (const [k, v] of Object.entries(settings)) {
        upsert.run(k, String(v));
      }
      logAudit(req, 'UPDATE_SETTINGS', 'System settings updated by Admin', 'system_settings');
    })();

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAuditLogs,
  getSettings,
  updateSettings
};
