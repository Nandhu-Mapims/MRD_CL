const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// All notification routes require an authenticated user
router.get('/', auth(['admin', 'auditor', 'chief']), notificationController.getMyNotifications);
router.post('/:id/read', auth(['admin', 'auditor', 'chief']), notificationController.markAsRead);
router.post('/read-all', auth(['admin', 'auditor', 'chief']), notificationController.markAllAsRead);

module.exports = router;

