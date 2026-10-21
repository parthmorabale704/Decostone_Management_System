const express = require('express');
const router = express.Router();
const godownController = require('../controllers/godownController');
const { authenticateToken, requireRole, checkGodownAccess } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', godownController.getAllGodowns);
router.get('/:id', checkGodownAccess('id'), godownController.getGodownById);
router.post('/', requireRole('admin'), godownController.createGodown);
router.put('/:id', requireRole('admin'), godownController.updateGodown);

module.exports = router;
