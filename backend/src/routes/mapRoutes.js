const express = require('express');
const router = express.Router();
const {
    getMapProperties,
    getMapPropertyById,
    getMapPropertyByInventoryId,
    createMapProperty,
    updateMapProperty,
    deleteMapProperty
} = require('../controllers/mapController');
const { protect } = require('../middleware/auth');

// Map Property Routes
router.route('/properties')
    .get(protect, getMapProperties)
    .post(protect, createMapProperty);

router.route('/properties/by-inventory/:inventoryItemId')
    .get(protect, getMapPropertyByInventoryId);

router.route('/properties/:id')
    .get(protect, getMapPropertyById)
    .put(protect, updateMapProperty)
    .delete(protect, deleteMapProperty);

module.exports = router;
