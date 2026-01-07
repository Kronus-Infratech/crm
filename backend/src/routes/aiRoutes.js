const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// All AI routes are protected
router.use(protect);

router.post('/chat', aiController.getAIChatResponse);

module.exports = router;
