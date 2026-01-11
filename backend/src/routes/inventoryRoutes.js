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
const { protect } = require('../middleware/auth');

// Project Routes
router.route('/projects')
    .get(protect, getProjects)
    .post(protect, createProject);

router.route('/projects/:id')
    .put(protect, updateProject)
    .delete(protect, deleteProject);

// Inventory Item Routes
router.route('/items')
    .get(protect, getInventoryItems)
    .post(protect, createInventoryItem);

router.route('/items/:id')
    .get(protect, getInventoryItemById)
    .put(protect, updateInventoryItem)
    .delete(protect, deleteInventoryItem);

module.exports = router;
