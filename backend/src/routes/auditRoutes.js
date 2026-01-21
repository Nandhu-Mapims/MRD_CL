const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const auth = require('../middleware/auth');

// User submit audit
router.post('/', auth(['admin', 'user']), auditController.submitAudit);

// Get all department checklists for a patient (multi-department view) - No auth required for patient reports
router.get('/patient-checklists', auditController.getPatientChecklists);

// Check for duplicate submission (before submitting)
router.get('/check-duplicate', auth(['admin', 'user']), auditController.checkDuplicateSubmission);

// Get submissions by UHID (for patient report) - Must be before catch-all routes
router.get('/uhid/:uhid', auth(['admin', 'user']), auditController.getSubmissionsByUHID);

// Get submissions by IPID (for specific admission)
router.get('/ipid/:ipid', auth(['admin', 'user']), auditController.getSubmissionsByIPID);

// Dashboard stats
router.get('/stats', auth(['admin']), auditController.getStats);

// Executive Analytics (MD-level strategic insights)
router.get('/executive-analytics', auth(['admin']), auditController.getExecutiveAnalytics);

// Export submissions (admin-only)
router.get('/export', auth(['admin']), auditController.exportSubmissions);

// User/admin view submissions (catch-all - must be last)
router.get('/', auth(['admin', 'user']), auditController.getSubmissions);

module.exports = router;


