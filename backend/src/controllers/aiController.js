const aiService = require('../services/aiService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Get AI insights and handle chat
 * @route   POST /api/ai/chat
 * @access  Private
 */
const getAIChatResponse = async (req, res, next) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Message is required"
            });
        }

        // Role-based context can be added here if needed
        const response = await aiService.generateInsight(message, history || []);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error("AI Controller Error:", error);
        next(error);
    }
};

/**
 * @desc    Stream AI chat response via SSE
 * @route   POST /api/ai/chat/stream
 * @access  Private
 */
const getAIChatResponseStream = async (req, res, next) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Message is required"
            });
        }

        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        });

        const sendEvent = (type, data) => {
            const payload = JSON.stringify({ type, data });
            res.write(`data: ${payload}\n\n`);
        };

        // Handle client disconnect
        let aborted = false;
        req.on('close', () => {
            aborted = true;
        });

        await aiService.generateInsightStream(message, history || [], (type, data) => {
            if (!aborted) {
                sendEvent(type, data);
            }
        });

        if (!aborted) {
            res.end();
        }
    } catch (error) {
        console.error("AI Stream Controller Error:", error);
        // If headers already sent, we can't send a JSON error
        if (!res.headersSent) {
            next(error);
        } else {
            const payload = JSON.stringify({ type: 'error', data: 'An unexpected error occurred.' });
            res.write(`data: ${payload}\n\n`);
            res.end();
        }
    }
};

module.exports = {
    getAIChatResponse,
    getAIChatResponseStream,
};
