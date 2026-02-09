const express = require('express');
const router = express.Router();
const { downloadReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.get('/download', protect, authorize(ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR), downloadReport);

module.exports = router;
