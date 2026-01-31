const express = require('express');
const router = express.Router();
const chiefDoctorController = require('../controllers/chiefDoctorController');
const auth = require('../middleware/auth');

// Admin: CRUD operations
router.post('/', auth('admin'), chiefDoctorController.createChiefDoctor);
router.get('/', auth(['admin', 'auditor', 'chief']), chiefDoctorController.listChiefDoctors);
router.put('/:id', auth('admin'), chiefDoctorController.updateChiefDoctor);
router.delete('/:id', auth('admin'), chiefDoctorController.deleteChiefDoctor);

module.exports = router;
