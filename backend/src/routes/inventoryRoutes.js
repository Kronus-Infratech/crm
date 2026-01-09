const express = require('express');
const router = express.Router();
const {
    getProjects,
    createProject,
    getInventoryItems,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    updateProject,
    deleteProject,
    getInventoryItemById
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Project Routes
router.route('/projects')
    .get(protect, getProjects)
    .post(protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE), createProject);

router.route('/projects/:id')
    .put(protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE), updateProject)
    .delete(protect, authorize(ROLES.ADMIN, ROLES.DIRECTOR), deleteProject);

// Inventory Item Routes
router.route('/items')
    .get(protect, getInventoryItems)
    .post(protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE), createInventoryItem);

router.route('/items/:id')
    .get(protect, getInventoryItemById)
    .put(protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.DIRECTOR, ROLES.EXECUTIVE), updateInventoryItem)
    .delete(protect, authorize(ROLES.ADMIN, ROLES.DIRECTOR), deleteInventoryItem);

module.exports = router;
