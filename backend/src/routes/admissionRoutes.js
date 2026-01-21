const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const auth = require('../middleware/auth');

// Create new admission
router.post('/', auth(['admin', 'user']), admissionController.createAdmission);

// Get admission by IPID
router.get('/ipid/:ipid', auth(['admin', 'user']), admissionController.getAdmissionByIPID);

// Get all admissions for a patient (by UHID)
router.get('/patient/:uhid', auth(['admin', 'user']), admissionController.getPatientAdmissions);

// Get active admission for a patient
router.get('/patient/:uhid/active', auth(['admin', 'user']), admissionController.getActiveAdmission);

// Discharge admission
router.put('/:ipid/discharge', auth(['admin', 'user']), admissionController.dischargeAdmission);

// Get all admissions (with filters)
router.get('/', auth(['admin']), admissionController.getAllAdmissions);

module.exports = router;

