const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { logAudit } = require('../services/auditService');

const asFlag = value => value === true || value === 1 || value === '1' || value === 'true';

function getAllUsers(req, res) {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.username, u.email, u.mobile, u.role,
             u.assigned_godown_id, u.can_stock_in, u.can_stock_out, u.can_adjust,
             u.is_active, u.created_at, u.updated_at,
             g.name as assigned_godown_name
      FROM users u
      LEFT JOIN godowns g ON u.assigned_godown_id = g.id
      ORDER BY u.id ASC
    `).all();

    const formatted = users.map(u => ({
      ...u,
      can_stock_in: Boolean(u.can_stock_in),
      can_stock_out: Boolean(u.can_stock_out),
      can_adjust: Boolean(u.can_adjust),
      is_active: Boolean(u.is_active)
    }));

    res.json({ success: true, users: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function createUser(req, res) {
  try {
    const {
      name, username, email, mobile, password, role = 'supervisor',
      assigned_godown_id, can_stock_in = 1, can_stock_out = 1, can_adjust = 0
    } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, username, email, and password are required.' });
    }

    if (!['admin', 'manager', 'supervisor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (role === 'supervisor' && !assigned_godown_id) {
      return res.status(400).json({ success: false, message: 'A supervisor must be assigned to a warehouse.' });
    }
    if (assigned_godown_id !== undefined && assigned_godown_id !== null && assigned_godown_id !== '' &&
        (!Number.isInteger(Number(assigned_godown_id)) || !db.prepare('SELECT 1 FROM godowns WHERE id = ? AND is_active = 1').get(Number(assigned_godown_id)))) {
      return res.status(400).json({ success: false, message: 'The selected warehouse does not exist or is inactive.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const info = db.prepare(`
      INSERT INTO users (name, username, email, mobile, password_hash, role, assigned_godown_id, can_stock_in, can_stock_out, can_adjust, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      name.trim(),
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      mobile || null,
      hash,
      role,
      assigned_godown_id ? Number(assigned_godown_id) : null,
      asFlag(can_stock_in) ? 1 : 0,
      asFlag(can_stock_out) ? 1 : 0,
      asFlag(can_adjust) ? 1 : 0
    );

    logAudit(req, 'CREATE_USER', `Created new user ${name} (${username}, role: ${role})`, 'users', info.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      userId: info.lastInsertRowid
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: users.username')) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ success: false, message: 'Email address is already in use.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function updateUser(req, res) {
  try {
    const { id } = req.params;
    const {
      name, email, mobile, password, role,
      assigned_godown_id, can_stock_in, can_stock_out, can_adjust, is_active
    } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const nextRole = role || user.role;
    const nextGodownId = assigned_godown_id !== undefined
      ? (assigned_godown_id ? Number(assigned_godown_id) : null)
      : user.assigned_godown_id;
    if (!['admin', 'manager', 'supervisor'].includes(nextRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }
    if (nextRole === 'supervisor' && !nextGodownId) {
      return res.status(400).json({ success: false, message: 'A supervisor must be assigned to a warehouse.' });
    }
    if (nextGodownId !== undefined && nextGodownId !== null &&
        (!Number.isInteger(Number(nextGodownId)) || !db.prepare('SELECT 1 FROM godowns WHERE id = ? AND is_active = 1').get(Number(nextGodownId)))) {
      return res.status(400).json({ success: false, message: 'The selected warehouse does not exist or is inactive.' });
    }
    if (Number(id) === req.user.id && (nextRole !== 'admin' || (is_active !== undefined && !asFlag(is_active)))) {
      return res.status(400).json({ success: false, message: 'You cannot remove your own administrator access or deactivate your account.' });
    }

    let passwordHash = user.password_hash;
    if (password && password.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, mobile = ?, password_hash = ?, role = ?,
          assigned_godown_id = ?, can_stock_in = ?, can_stock_out = ?, can_adjust = ?,
          is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? name.trim() : user.name,
      email ? email.trim().toLowerCase() : user.email,
      mobile !== undefined ? mobile : user.mobile,
      passwordHash,
      nextRole,
      nextGodownId,
      can_stock_in !== undefined ? (asFlag(can_stock_in) ? 1 : 0) : user.can_stock_in,
      can_stock_out !== undefined ? (asFlag(can_stock_out) ? 1 : 0) : user.can_stock_out,
      can_adjust !== undefined ? (asFlag(can_adjust) ? 1 : 0) : user.can_adjust,
      is_active !== undefined ? (asFlag(is_active) ? 1 : 0) : user.is_active,
      id
    );

    logAudit(req, 'UPDATE_USER', `Updated user ID ${id} (${user.username})`, 'users', id);

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'Email address is already in use.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, name, is_active FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const newStatus = user.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

    logAudit(req, 'TOGGLE_USER_STATUS', `${newStatus ? 'Activated' : 'Deactivated'} user ${user.name} (ID: ${id})`, 'users', id);

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      isActive: Boolean(newStatus)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = db.prepare('SELECT name, username FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hasTransactions = db.prepare('SELECT 1 FROM stock_transactions WHERE user_id = ? LIMIT 1').get(id);
    const hasTransfers = db.prepare('SELECT 1 FROM stock_transfers WHERE user_id = ? LIMIT 1').get(id);
    const hasAdjustments = db.prepare('SELECT 1 FROM stock_adjustments WHERE user_id = ? LIMIT 1').get(id);
    if (hasTransactions || hasTransfers || hasAdjustments) {
      return res.status(409).json({ success: false, message: 'This user has recorded inventory activity. Deactivate the account to preserve the audit history.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logAudit(req, 'DELETE_USER', `Deleted user ${user.name} (${user.username})`, 'users', id);

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
};
