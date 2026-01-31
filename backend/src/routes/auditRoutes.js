const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const auth = require('../middleware/auth');

// Doctor submit audit
router.post('/', auth(['admin', 'auditor']), auditController.submitAudit);

// Get all department checklists for a patient (multi-department view) - No auth required for patient reports
router.get('/patient-checklists', auditController.getPatientChecklists);

// Check for duplicate submission (before submitting)
router.get('/check-duplicate', auth(['admin', 'auditor']), auditController.checkDuplicateSubmission);

// Get submissions by UHID (for patient report) - Must be before catch-all routes
router.get('/uhid/:uhid', auth(['admin', 'auditor', 'chief']), auditController.getSubmissionsByUHID);

// Get submissions by IPID (for specific admission)
router.get('/ipid/:ipid', auth(['admin', 'auditor', 'chief']), auditController.getSubmissionsByIPID);

// Dashboard stats
router.get('/stats', auth(['admin']), auditController.getStats);

// Executive Analytics (MD-level strategic insights)
router.get('/executive-analytics', auth(['admin']), auditController.getExecutiveAnalytics);

// Comprehensive Analytics Endpoints
router.get('/analytics/time-series', auth(['admin']), auditController.getTimeSeriesAnalytics);
router.get('/analytics/user-activity', auth(['admin']), auditController.getUserActivityAnalytics);
router.get('/analytics/admissions', auth(['admin']), auditController.getAdmissionAnalytics);
router.get('/analytics/forms', auth(['admin']), auditController.getFormTemplateAnalytics);
router.get('/analytics/comprehensive', auth(['admin']), auditController.getComprehensiveAnalytics);

// Export submissions (admin-only)
router.get('/export', auth(['admin']), auditController.exportSubmissions);

// Doctor/Chief/Admin view submissions (catch-all - must be last)
router.get('/', auth(['admin', 'auditor', 'chief']), auditController.getSubmissions);

module.exports = router;


