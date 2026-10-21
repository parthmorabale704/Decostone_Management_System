const express = require('express');
const router = express.Router();
const controller = require('../controllers/operationsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/suppliers', controller.partyList('suppliers'));
router.post('/suppliers', requireRole('admin', 'manager'), controller.createParty('suppliers'));
router.get('/customers', controller.partyList('customers'));
router.post('/customers', requireRole('admin', 'manager'), controller.createParty('customers'));
router.get('/orders', controller.listOrders);
router.post('/orders', controller.createOrder);
router.get('/orders/:id', controller.getOrder);
router.post('/orders/:id/:action', controller.transitionOrder);
router.get('/counts', controller.listCounts);
router.get('/lots', controller.listLots);
router.post('/counts', controller.createCount);
router.get('/counts/:id', controller.getCount);
router.put('/counts/:sessionId/lines/:lineId', controller.updateCountLine);
router.post('/counts/:id/submit', controller.submitCount);
router.post('/counts/:id/:action', requireRole('admin', 'manager'), controller.reviewCount);
router.get('/database/backup', requireRole('admin'), controller.createBackup);

module.exports = router;
