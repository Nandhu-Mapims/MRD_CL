const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');
const auth = require('../middleware/auth');

// Admin CRUD
router.post('/', auth('admin'), checklistController.createChecklistItem);
router.put('/:id', auth('admin'), checklistController.updateChecklistItem);
router.delete('/:id', auth('admin'), checklistController.deleteChecklistItem);
router.post('/reorder', auth('admin'), checklistController.reorderChecklistItems);

// User: get checklist for a department (includes ALL + dept-specific)
router.get('/department/:departmentId', auth(['admin', 'user']), checklistController.getChecklistForDepartment);

module.exports = router;


