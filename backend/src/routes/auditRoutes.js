const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Audit logs - Admin only
router.get('/logs', requireRole('admin'), auditController.getAuditLogs);

// Settings
router.get('/settings', auditController.getSettings);
router.put('/settings', requireRole('admin'), auditController.updateSettings);

module.exports = router;
