const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', categoryController.getAllCategories);
router.post('/', requireRole('admin'), categoryController.createCategory);
router.post('/bulk', requireRole('admin'), categoryController.createCategoriesBulk);
router.delete('/', requireRole('admin'), categoryController.replaceAllCategories);
router.put('/:id', requireRole('admin'), categoryController.updateCategory);
router.delete('/:id', requireRole('admin'), categoryController.deleteCategory);

module.exports = router;
