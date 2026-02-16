const express = require('express');
const { sendEmail, sendTemplateEmail, getQueueStatus } = require('../services/emailService');
const { EMAIL_TEMPLATES } = require('../config/constants');

const router = express.Router();

/**
 * POST /api/email/send
 * Send a generic email
 */
router.post('/send', async (req, res, next) => {
    try {
        const { to, subject, html, text, fromName, attachments } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject, html'
            });
        }

        const result = await sendEmail({ to, subject, html, text, fromName, attachments });

        res.status(200).json({
            success: true,
            message: 'Email queued for sending',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/email/send-template
 * Send a template-based email
 */
router.post('/send-template', async (req, res, next) => {
    try {
        const { template, to, data } = req.body;

        if (!template || !to || !data) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: template, to, data'
            });
        }

        if (!EMAIL_TEMPLATES[template]) {
            return res.status(400).json({
                success: false,
                error: `Invalid template. Valid templates: ${Object.keys(EMAIL_TEMPLATES).join(', ')}`
            });
        }

        const result = await sendTemplateEmail(template, to, data);

        res.status(200).json({
            success: true,
            message: 'Template email queued for sending',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/email/queue/status
 * Get queue status (admin endpoint)
 */
router.get('/queue/status', (req, res) => {
    const status = getQueueStatus();

    res.status(200).json({
        success: true,
        data: status
    });
});

module.exports = router;
