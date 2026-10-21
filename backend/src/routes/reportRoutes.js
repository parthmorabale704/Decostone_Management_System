const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Dashboard summary is visible to Admin, Manager, Supervisor (Supervisor can see dashboard metrics)
router.get('/dashboard-summary', reportController.getDashboardSummary);

// Detailed reports - Admin and Manager only
router.get('/godown-wise', requireRole('admin', 'manager'), reportController.getGodownWiseReport);
router.get('/category-wise', requireRole('admin', 'manager'), reportController.getCategoryWiseReport);
router.get('/material-movement', requireRole('admin', 'manager'), reportController.getMaterialMovementReport);
router.get('/user-activity', requireRole('admin'), reportController.getUserActivityReport);

module.exports = router;
