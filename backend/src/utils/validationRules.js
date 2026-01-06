const { body, param, query } = require('express-validator');

/**
 * Validation rules for user registration
 */
// const registerValidation = [
//   body('email')
//     .isEmail()
//     .withMessage('Please provide a valid email address')
//     .custom((value) => {
//       if (!value.endsWith('@kronusinfra.org')) {
//         throw new Error('Registration is restricted to @kronusinfra.org email addresses');
//       }
//       return true;
//     }),
//   body('password')
//     .isLength({ min: 8 })
//     .withMessage('Password must be at least 8 characters long')
//     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
//     .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
//   body('name')
//     .trim()
//     .notEmpty()
//     .withMessage('Name is required')
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Name must be between 2 and 100 characters'),
//   body('phone')
//     .optional()
//     .matches(/^\+?[\d\s\-()]+$/)
//     .withMessage('Please provide a valid phone number'),
// ];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for forgot password
 */
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
];

/**
 * Validation rules for reset password
 */
const resetPasswordValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

/**
 * Validation rules for updating profile
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('department')
    .optional()
    .trim(),
  body('designation')
    .optional()
    .trim(),
];

/**
 * Validation rules for creating a lead
 */
const createLeadValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('property')
    .trim()
    .notEmpty()
    .withMessage('Property is required'),
  body('source')
    .optional()
    .isIn(['WEBSITE', 'REFERRAL', 'INSTAGRAM', 'YOUTUBE', 'EMAIL', 'WHATSAPP', 'NINETY_NINE_ACRES', 'MAGICBRICKS', 'OLX', 'COLD_OUTREACH', "WALK_IN"])
    .withMessage('Invalid lead source'),
  body('status')
    .optional()
    .isIn(['NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'SITE_VISIT', 'NEGOTIATION', 'DOCUMENTATION', 'WON', 'LOST'])
    .withMessage('Invalid lead status'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Follow-up date must be a valid date'),
];

/**
 * Validation rules for updating a lead
 */
const updateLeadValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('property')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Property cannot be empty'),
  body('source')
    .optional()
    .isIn(['WEBSITE', 'REFERRAL', 'INSTAGRAM', 'YOUTUBE', 'EMAIL', 'WHATSAPP', 'NINETY_NINE_ACRES', 'MAGICBRICKS', 'OLX', 'COLD_OUTREACH', 'WALK_IN'])
    .withMessage('Invalid lead source'),
  body('status')
    .optional()
    .isIn(['NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'SITE_VISIT', 'NEGOTIATION', 'DOCUMENTATION', 'WON', 'LOST'])
    .withMessage('Invalid lead status'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Follow-up date must be a valid date'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];
const createUserValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('roles')
    .isArray({ min: 1 })
    .withMessage('At least one role must be specified'),
  body('roles.*')
    .isIn(['ADMIN', 'EXECUTIVE', 'DIRECTOR', 'MANAGER', 'SALESMAN'])
    .withMessage('Invalid role specified'),
  body('department').optional().trim(),
  body('designation').optional().trim(),
];

const updateUserValidation = [
  body('email').optional().isEmail().withMessage('Please provide a valid email address'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('roles')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one role must be specified'),
  body('roles.*')
    .isIn(['ADMIN', 'EXECUTIVE', 'DIRECTOR', 'MANAGER', 'SALESMAN'])
    .withMessage('Invalid role specified'),
  body('department').optional().trim(),
  body('designation').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

/**
 * Validation for MongoDB ObjectId
 */
const idValidation = [
  param('id')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid ID format'),
];

module.exports = {
  // registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  updateProfileValidation,
  createUserValidation,
  updateUserValidation,
  createLeadValidation,
  updateLeadValidation,
  idValidation,
};
