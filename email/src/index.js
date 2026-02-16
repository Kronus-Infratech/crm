require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const emailRoutes = require('./routes/emailRoutes');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health check route (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Email service is running',
        timestamp: new Date().toISOString(),
    });
});

// API routes (auth required)
app.use('/api/email', authMiddleware, emailRoutes);

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Kronus Email Microservice',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            sendEmail: 'POST /api/email/send',
            sendTemplate: 'POST /api/email/send-template',
            queueStatus: 'GET /api/email/queue/status'
        }
    });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
    logger.info(`
╔═══════════════════════════════════════════╗
║                                           ║
║     Kronus Email Microservice             ║
║                                           ║
║     Environment: ${process.env.NODE_ENV}              ║
║     Port: ${PORT}                            ║
║     API Base: http://localhost:${PORT}/api   ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

module.exports = app;
