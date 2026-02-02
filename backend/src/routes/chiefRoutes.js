const express = require('express');
const router = express.Router();
const chiefController = require('../controllers/chiefController');
const auth = require('../middleware/auth');

// Admin only: Chief Analytics (statistics, trends, performance of all chiefs)
router.get('/admin/analytics', auth('admin'), chiefController.getChiefAnalytics);

// Chief's own analytics (summary, by department, last 7 days trend)
router.get('/my-analytics', auth(['admin', 'chief']), chiefController.getMyAnalytics);

// All routes require authentication
router.get('/patients', auth(['admin', 'chief']), chiefController.getChiefPatients);
router.get('/patient-submissions', auth(['admin', 'chief']), chiefController.getChiefPatientSubmissions);
router.put('/submissions/:id/corrective-preventive', auth(['admin', 'chief']), chiefController.updateCorrectivePreventive);
router.get('/doctor-performance', auth(['admin', 'chief']), chiefController.getDoctorPerformance);

module.exports = router;
