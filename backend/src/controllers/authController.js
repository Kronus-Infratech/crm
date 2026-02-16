const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { HTTP_STATUS, ROLES } = require('../config/constants');
const { generateToken, generateRefreshToken } = require('../utils/tokenUtils');
const { generateResetToken, hashToken } = require('../utils/cryptoUtils');
const emailClient = require('../services/emailClient');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
// const register = async (req, res, next) => {
//   try {
//     const { email, password, name, phone } = req.body;

//     // Check if user already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { email },
//     });

//     if (existingUser) {
//       return res.status(HTTP_STATUS.CONFLICT).json({
//         success: false,
//         message: 'User with this email already exists',
//       });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create user
//     const user = await prisma.user.create({
//       data: {
//         email,
//         password: hashedPassword,
//         name,
//         phone: phone || null,
//         roles: [ROLES.SALESMAN],
//       },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         phone: true,
//         roles: true,
//         isActive: true,
//         createdAt: true,
//       },
//     });

//     // Generate tokens
//     const token = generateToken(user.id);
//     const refreshToken = generateRefreshToken(user.id);

//     res.status(HTTP_STATUS.CREATED).json({
//       success: true,
//       message: 'User registered successfully',
//       data: {
//         user,
//         token,
//         refreshToken,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        isActive: true,
        department: true,
        designation: true,
        profileImage: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password - send reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);
    const resetExpire = new Date(Date.now() + parseInt(process.env.RESET_PASSWORD_EXPIRE));

    // Save hashed token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: resetExpire,
      },
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      // Send email
      await emailClient.sendPasswordResetEmail(user.email, resetUrl, user.name);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (emailError) {
      // Rollback token if email fails
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpire: null,
        },
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Email could not be sent',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token from URL to compare with stored hashed token
    const hashedToken = hashToken(token);

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password (when logged in)
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (client should delete token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    // In a token-based system, logout is handled client-side by deleting the token
    // This endpoint is for consistency and can be used for logging or tracking
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
};
