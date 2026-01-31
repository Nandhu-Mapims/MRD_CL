const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
// SECURITY: register-admin removed - admin user is auto-created on server startup
// router.post('/register-admin', authController.registerAdmin); // REMOVED FOR SECURITY
router.post('/login', authController.login);

// Admin-only routes
router.post('/users', auth('admin'), authController.registerUser);
router.get('/users', auth('admin'), authController.listUsers);
router.put('/users/:id', auth('admin'), authController.updateUser);
router.delete('/users/:id', auth('admin'), authController.deleteUser);

module.exports = router;


