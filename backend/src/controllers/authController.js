const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

function login(req, res) {
  try {
    const { username, password } = req.body;
    const selectedRole = req.body.role || req.body.selectedRole;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    const loginName = username.trim().toLowerCase();
    const user = db.prepare(`
      SELECT u.*, g.name as assigned_godown_name
      FROM users u
      LEFT JOIN godowns g ON u.assigned_godown_id = g.id
      WHERE (u.username = ? OR u.email = ?)
    `).get(loginName, loginName);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact an administrator.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Strict Role-Based Authentication: Verify selected role matches user's actual database role
    if (selectedRole) {
      const normalizedSelectedRole = String(selectedRole).trim().toLowerCase();
      const normalizedActualRole = String(user.role).trim().toLowerCase();
      if (normalizedSelectedRole !== normalizedActualRole) {
        return res.status(401).json({
          success: false,
          message: 'Invalid role. This account is not registered for the selected role.'
        });
      }
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      assigned_godown_id: user.assigned_godown_id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    // Safe user object
    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      assigned_godown_id: user.assigned_godown_id,
      assigned_godown_name: user.assigned_godown_name,
      can_stock_in: Boolean(user.can_stock_in),
      can_stock_out: Boolean(user.can_stock_out),
      can_adjust: Boolean(user.can_adjust)
    };

    req.user = safeUser;
    logAudit(req, 'USER_LOGIN', `User ${user.name} (${user.role}) logged in successfully.`, 'users', user.id);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

function getProfile(req, res) {
  try {
    const user = db.prepare(`
      SELECT u.id, u.name, u.username, u.email, u.mobile, u.role, u.assigned_godown_id,
             u.can_stock_in, u.can_stock_out, u.can_adjust, u.is_active,
             g.name as assigned_godown_name
      FROM users u
      LEFT JOIN godowns g ON u.assigned_godown_id = g.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user: {
        ...user,
        can_stock_in: Boolean(user.can_stock_in),
        can_stock_out: Boolean(user.can_stock_out),
        can_adjust: Boolean(user.can_adjust)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);
    logAudit(req, 'PASSWORD_CHANGE', `User ${req.user.name} changed their password.`, 'users', req.user.id);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  login,
  getProfile,
  changePassword
};
