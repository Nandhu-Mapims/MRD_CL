const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const auth = require('../middleware/auth');

// Admin: get full master data (designations, wards, units)
router.get('/', auth(['admin']), masterDataController.getMasterData);

// Admin: update master data
router.put('/', auth(['admin']), masterDataController.updateMasterData);

module.exports = router;
