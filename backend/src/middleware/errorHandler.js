const { HTTP_STATUS } = require('../config/constants');
const prisma = require('../config/database');

/**
 * Global error handler middleware
 */
const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Prisma Client Known Request Error
  if (err.code && err.code.startsWith('P')) {
    error.message = handlePrismaError(err);
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `${field} already exists`;
    error.statusCode = HTTP_STATUS.CONFLICT;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(e => e.message).join(', ');
    error.statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
  }

  // Set default status code if not set
  if (!error.statusCode) {
    error.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  // Handle Internal Server Errors (500)
  if (error.statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    // Log to database
    try {
      await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          message: err.message || 'Unknown Error',
          stack: err.stack,
          path: req.originalUrl,
          method: req.method,
          userId: req.user ? req.user.id : null
        }
      });
    } catch (logErr) {
      console.error("Failed to log error to DB:", logErr);
    }

    // Hide details from user
    error.message = "This is an Internal Error. Please contact your Developers.";
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        prismaCode: err.code,
        prismaMeta: err.meta
    }),
  });
};

/**
 * Handle Prisma errors
 */
const handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const target = err.meta?.target || 'Field';
      return `${target} already exists`;
    case 'P2025':
      // Record not found
      return 'Record not found';
    case 'P2003':
      // Foreign key constraint failed
      return 'Related record not found';
    case 'P2014':
      // Invalid relation
      return 'Invalid relation data';
    default:
      return err.message || 'Database operation failed';
  }
};

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

module.exports = { errorHandler, notFound };
