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

module.exports = {
    getAIChatResponse
};
