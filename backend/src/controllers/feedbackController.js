const prisma = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Verify if feedback token is valid and not already submitted
 * @route   GET /api/feedback/:token
 * @access  Public
 */
const verifyFeedbackToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        const lead = await prisma.lead.findFirst({
            where: {
                feedbackToken: token,
            },
            select: {
                id: true,
                name: true,
                feedbackSubmitted: true,
            },
        });

        if (!lead) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Invalid feedback link',
            });
        }

        if (lead.feedbackSubmitted) {
            return res.status(409).json({ // 409 Conflict
                success: false,
                message: 'Feedback already submitted',
                data: {
                    alreadySubmitted: true
                }
            });
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                valid: true,
                name: lead.name
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Submit feedback
 * @route   POST /api/feedback/:token
 * @access  Public
 */
const submitFeedback = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Please provide a valid rating (1-5)',
            });
        }

        const lead = await prisma.lead.findFirst({
            where: {
                feedbackToken: token,
            },
        });

        if (!lead) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Invalid feedback link',
            });
        }

        if (lead.feedbackSubmitted) {
            return res.status(409).json({
                success: false,
                message: 'Feedback already submitted',
            });
        }

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                feedbackSubmitted: true,
                feedbackRating: parseInt(rating),
                feedbackComment: comment,
            },
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Feedback submitted successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    verifyFeedbackToken,
    submitFeedback,
};
