const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const { authenticateToken, requireRole, checkGodownAccess } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', checkGodownAccess('godown_id'), materialController.getAllMaterials);
router.get('/:id', checkGodownAccess('godown_id'), materialController.getMaterialById);
router.post('/', requireRole('admin', 'manager'), materialController.createMaterial);
router.put('/:id', requireRole('admin', 'manager'), materialController.updateMaterial);
router.delete('/:id', requireRole('admin'), materialController.deleteMaterial);

module.exports = router;
