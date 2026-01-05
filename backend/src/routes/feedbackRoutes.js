const express = require('express');
const router = express.Router();
const { verifyFeedbackToken, submitFeedback } = require('../controllers/feedbackController');

router.get('/:token', verifyFeedbackToken);
router.post('/:token', submitFeedback);

module.exports = router;
