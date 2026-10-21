const db = require('../db/database');

function logAudit(req, action, details, affectedTable = null, affectedId = null) {
  try {
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.name : 'System/Anonymous';
    const role = req.user ? req.user.role : 'system';
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, role, action, details, ip_address, affected_table, affected_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(userId, userName, role, action, typeof details === 'object' ? JSON.stringify(details) : details, ipAddress, affectedTable, String(affectedId || ''));
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

module.exports = { logAudit };
