const express = require('express');
const router = express.Router();
const {
    getQuarterlyKPI,
    getKPILeaderboard,
    getKPIAdminSummary,
    getKPITargets,
    saveKPITargets,
    recalculateKPI,
    getCurrentQuarterInfo
} = require('../controllers/kpiController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(protect);

router.get('/quarter', getCurrentQuarterInfo);
router.get('/quarterly', getQuarterlyKPI);
router.get('/leaderboard', getKPILeaderboard);
router.get('/admin-summary', authorize(ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR, ROLES.MANAGER), getKPIAdminSummary);
router.get('/targets', authorize(ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR), getKPITargets);
router.put('/targets', authorize(ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR), saveKPITargets);
router.post('/recalculate', authorize(ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR), recalculateKPI);

module.exports = router;
