const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticateToken, requireRole, requirePermission, checkGodownAccess } = require('../middleware/auth');

router.use(authenticateToken);

// Stock In
router.post('/in', requirePermission('can_stock_in'), checkGodownAccess('godownId'), stockController.handleStockIn);

// Stock Out
router.post('/out', requirePermission('can_stock_out'), checkGodownAccess('godownId'), stockController.handleStockOut);

// Material Transfer (Admin and Manager only)
router.post('/transfer', requireRole('admin', 'manager'), stockController.handleTransfer);

// Stock Adjustment (Admin or Manager with can_adjust permission)
router.post('/adjust', requirePermission('can_adjust'), checkGodownAccess('godownId'), stockController.handleAdjustment);

// Query transactions history
router.get('/transactions', checkGodownAccess('godown_id'), stockController.getTransactions);

// Query transfers
router.get('/transfers', checkGodownAccess('godown_id'), stockController.getTransfers);

// Query adjustments
router.get('/adjustments', checkGodownAccess('godown_id'), stockController.getAdjustments);

// Query low stock items
router.get('/low-stock', checkGodownAccess('godown_id'), stockController.getLowStockAlerts);

module.exports = router;
