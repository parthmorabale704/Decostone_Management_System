const jwt = require('jsonwebtoken');
const db = require('../db/database');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'decostone_local_development_secret_change_me';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, username, email, mobile, role, assigned_godown_id, can_stock_in, can_stock_out, can_adjust, is_active FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role: ${allowedRoles.join(' or ')}.`
      });
    }
    next();
  };
}

function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }
    if (!req.user[permissionName]) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have '${permissionName}' permission.`
      });
    }
    next();
  };
}

function checkGodownAccess(godownIdParam = 'godown_id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      return next();
    }
    const requestedGodownId = req.params[godownIdParam] ?? (req.body || {})[godownIdParam] ?? req.query[godownIdParam];
    if (!req.user.assigned_godown_id) {
      return res.status(403).json({ success: false, message: 'No warehouse is assigned to this account.' });
    }
    if (requestedGodownId === undefined || requestedGodownId === null || requestedGodownId === '') {
      if (req.method === 'GET' && req.query) {
        req.scopedGodownId = String(req.user.assigned_godown_id);
        return next();
      }
      return res.status(400).json({ success: false, message: 'A warehouse must be selected.' });
    }
    if (!Number.isInteger(Number(requestedGodownId)) || Number(requestedGodownId) !== Number(req.user.assigned_godown_id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You only have access to your assigned warehouse.'
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
  requirePermission,
  checkGodownAccess
};
