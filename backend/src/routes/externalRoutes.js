const express = require('express');
const router = express.Router();
const { createExternalLead, createMagicBricksLead } = require('../controllers/leadController');
const { verifyApiKey } = require('../middleware/externalAuth');

/**
 * @route   POST /api/external/leads/99acres
 * @desc    Endpoint for 99 Acres to push new leads
 * @access  External (API Key)
 */
router.post('/leads/99acres', verifyApiKey, createExternalLead);

/**
 * @route   POST /api/external/leads/magicbricks
 * @desc    Endpoint for MagicBricks to push new leads
 * @access  External (API Key)
 */
router.post('/leads/magicbricks', verifyApiKey, createMagicBricksLead);

module.exports = router;
