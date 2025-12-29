const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const validate = require('../middleware/validate');
const { 
  updateProfileValidation, 
  idValidation, 
  createUserValidation, 
  updateUserValidation 
} = require('../utils/validationRules');

// User profile routes (accessible by authenticated users)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, validate, updateProfile);

// User management routes (accessible by all internal roles for assignment/stats)
router.get('/stats', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE, ROLES.SALESMAN), getUserStats);
router.get('/', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE, ROLES.SALESMAN), getUsers);
router.get('/:id', protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE, ROLES.SALESMAN), idValidation, validate, getUserById);

// Admin-only routes
router.post('/', protect, authorize(ROLES.ADMIN), createUserValidation, validate, createUser);
router.put('/:id', protect, authorize(ROLES.ADMIN), idValidation, updateUserValidation, validate, updateUser);
router.delete('/:id', protect, authorize(ROLES.ADMIN), idValidation, validate, deleteUser);

module.exports = router;
