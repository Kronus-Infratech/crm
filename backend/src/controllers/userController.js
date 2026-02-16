const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { HTTP_STATUS, ROLES } = require('../config/constants');
const { generatePassword } = require('../utils/cryptoUtils');
const { sendWelcomeEmail } = require('../services/emailClient');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
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
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, department, designation, profileImage } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(department !== undefined && { department }),
        ...(designation !== undefined && { designation }),
        ...(profileImage !== undefined && { profileImage }),
      },
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
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (with pagination, search, and filters)
 * @route   GET /api/users
 * @access  Private (Admin, Manager)
 */
const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role, // Filtering by a single role match
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { roles: { has: role } }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
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
      }),
      prisma.user.count({ where }),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin, Manager)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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
        _count: {
          select: {
            createdLeads: true,
            assignedLeads: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const { email, name, phone, roles, department, designation } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Generate temporary password
    const tempPassword = generatePassword(12);

    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        roles: roles || [ROLES.SALESMAN],
        department: department || null,
        designation: designation || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        isActive: true,
        department: true,
        designation: true,
        createdAt: true,
      },
    });

    // Send welcome email with temporary password
    try {
      await sendWelcomeEmail(user.email, user.name, tempPassword);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User created successfully. Welcome email sent with temporary password.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, roles, department, designation, isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent modifying admin by non-admin
    if (existingUser.roles.includes(ROLES.ADMIN) && !req.user.roles.includes(ROLES.ADMIN)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'You cannot modify an admin account',
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(roles && { roles }),
        ...(department !== undefined && { department }),
        ...(designation !== undefined && { designation }),
        ...(isActive !== undefined && { isActive }),
      },
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
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting admin
    if (user.roles.includes(ROLES.ADMIN)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Cannot delete admin account',
      });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Soft delete (deactivate) instead of hard delete to preserve data integrity
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private (Admin, Manager)
 */
const getUserStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
};
