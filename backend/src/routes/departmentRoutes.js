const express = require('express');
const router = express.Router();
const deptController = require('../controllers/departmentController');
const auth = require('../middleware/auth');

// Admin-only routes
router.post('/', auth('admin'), deptController.createDepartment);
router.get('/logs', auth(['admin', 'auditor', 'chief']), deptController.getDepartmentLogs);
router.get('/users', auth(['admin', 'auditor', 'chief']), deptController.getDepartmentUsers);
router.get('/', auth(['admin', 'auditor', 'chief']), deptController.listDepartments);
router.put('/:id', auth('admin'), deptController.updateDepartment);
router.delete('/:id', auth('admin'), deptController.deleteDepartment);

module.exports = router;


