const express = require('express');
const router = express.Router();
const {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveReports
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// User routes
router.post('/', applyLeave);
router.get('/my', getMyLeaves);

// HR/Admin routes
router.get('/', authorize('HR', 'ADMIN'), getAllLeaves);
router.get('/reports', authorize('HR', 'ADMIN'), getLeaveReports);
router.put('/:id/status', authorize('HR', 'ADMIN'), updateLeaveStatus);

module.exports = router;
