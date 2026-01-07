require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const {
  limiter,
  helmetConfig
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leadRoutes = require('./routes/leadRoutes');
const externalRoutes = require('./routes/externalRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { initCronJobs } = require('./services/cronService');

// Initialize express app
const app = express();

// Start cron jobs
initCronJobs();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Rate limiting
// app.use('/api/', limiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ai', aiRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Kronus CRM API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      leads: '/api/leads',
      external: '/api/external',
      feedback: '/api/feedback',
      inventory: '/api/inventory',
      ai: '/api/ai',
    },
  });
});

// 404 handler - must be after all routes
app.use(notFound);

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║       Kronus CRM Backend Server           ║
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
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

module.exports = app;