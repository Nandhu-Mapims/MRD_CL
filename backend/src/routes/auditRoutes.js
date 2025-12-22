const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const auth = require('../middleware/auth');

// User submit audit
router.post('/', auth(['admin', 'user']), auditController.submitAudit);

// Update audit (edit existing submission)
router.put('/', auth(['admin', 'user']), auditController.updateAudit);

// Get recent submissions grouped by UHID (for edit selection)
router.get('/recent', auth(['admin', 'user']), auditController.getRecentSubmissions);

// Get submissions for editing (by UHID and department)
router.get('/edit', auth(['admin', 'user']), auditController.getSubmissionsForEdit);

// Get submissions by UHID (for patient report) - Must be before catch-all routes
router.get('/uhid/:uhid', auth(['admin', 'user']), auditController.getSubmissionsByUHID);

// Dashboard stats
router.get('/stats', auth(['admin']), auditController.getStats);

// Export submissions (admin-only)
router.get('/export', auth(['admin']), auditController.exportSubmissions);

// User/admin view submissions (catch-all - must be last)
router.get('/', auth(['admin', 'user']), auditController.getSubmissions);

module.exports = router;


