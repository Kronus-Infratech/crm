const express = require('express');
const router = express.Router();
const {
    getTransactions,
    createTransaction,
    getPendingApprovals,
    handleApproval
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// All finance routes are protected and restricted to EXECUTIVE, DIRECTOR, and ADMIN
router.use(protect);
router.use(authorize(ROLES.EXECUTIVE, ROLES.DIRECTOR, ROLES.ADMIN));

router.route('/transactions')
    .get(getTransactions)
    .post(createTransaction);

router.get('/approvals', getPendingApprovals);
router.patch('/approvals/:id', handleApproval);

module.exports = router;
