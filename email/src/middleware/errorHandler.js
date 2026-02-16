/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('[EmailService Error]:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * 404 handler
 */
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
};

module.exports = { errorHandler, notFound };
