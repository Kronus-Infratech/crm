const express = require('express');
const router = express.Router();
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  assignLead,
  deleteDocument,
} = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const validate = require('../middleware/validate');
const { createLeadValidation, updateLeadValidation, idValidation } = require('../utils/validationRules');

// Lead statistics (place before /:id to avoid route conflicts)
router.get('/stats', protect, getLeadStats);

// Lead CRUD operations
router.get('/', protect, getLeads);
router.get('/:id', protect, idValidation, validate, getLeadById);
router.post('/', protect, createLeadValidation, validate, createLead);
router.put('/:id', protect, idValidation, updateLeadValidation, validate, updateLead);
router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), idValidation, validate, deleteLead);

// Lead assignment (Admin and Manager only)
router.put('/:id/assign', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), idValidation, validate, assignLead);

// Document deletion
router.delete('/documents/:id', protect, idValidation, validate, deleteDocument);

module.exports = router;
