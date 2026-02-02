const express = require('express');
const router = express.Router();
const chiefController = require('../controllers/chiefController');
const auth = require('../middleware/auth');

// Admin only: Chief Analytics (statistics, trends, performance of all chiefs)
router.get('/admin/analytics', auth('admin'), chiefController.getChiefAnalytics);

// All routes require authentication
router.get('/patients', auth(['admin', 'chief']), chiefController.getChiefPatients);
router.get('/patient-submissions', auth(['admin', 'chief']), chiefController.getChiefPatientSubmissions);
router.put('/submissions/:id/corrective-preventive', auth(['admin', 'chief']), chiefController.updateCorrectivePreventive);
router.post('/submissions/bulk-corrective-preventive', auth(['admin', 'chief']), chiefController.bulkUpdateCorrectivePreventive);
router.get('/doctor-performance', auth(['admin', 'chief']), chiefController.getDoctorPerformance);

module.exports = router;
