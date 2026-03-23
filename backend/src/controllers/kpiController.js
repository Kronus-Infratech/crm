const { HTTP_STATUS, ROLES } = require('../config/constants');
const {
    getQuarterRange,
    recalculateQuarterKPIs,
    getQuarterlyKPIForUser,
    getLeaderboard,
    getAdminSummary,
    upsertTargets,
    getTargets
} = require('../services/kpiService');

const privilegedRoles = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR, ROLES.MANAGER];

const getQuarterlyKPI = async (req, res, next) => {
    try {
        const { quarterKey, userId } = req.query;
        const requesterRoles = req.user.roles || [];
        const isPrivileged = requesterRoles.some((r) => privilegedRoles.includes(r));

        const targetUserId = isPrivileged && userId ? userId : req.user.id;
        const kpi = await getQuarterlyKPIForUser({ userId: targetUserId, quarterKey });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: kpi
        });
    } catch (error) {
        next(error);
    }
};

const getKPILeaderboard = async (req, res, next) => {
    try {
        const { quarterKey, limit = 100 } = req.query;
        const rows = await getLeaderboard({ quarterKey, limit: Number(limit) });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

const getKPIAdminSummary = async (req, res, next) => {
    try {
        const { quarterKey } = req.query;
        const data = await getAdminSummary({ quarterKey });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

const getKPITargets = async (req, res, next) => {
    try {
        const { quarterKey } = req.query;
        const data = await getTargets({ quarterKey });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

const saveKPITargets = async (req, res, next) => {
    try {
        const { quarterKey, targets } = req.body;

        if (!Array.isArray(targets)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'targets must be an array'
            });
        }

        const data = await upsertTargets({
            quarterKey,
            targets,
            createdById: req.user.id
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Quarterly KPI targets updated successfully',
            data
        });
    } catch (error) {
        next(error);
    }
};

const recalculateKPI = async (req, res, next) => {
    try {
        const { quarterKey } = req.body || {};
        const result = await recalculateQuarterKPIs({ quarterKey });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'KPI recalculation completed',
            data: {
                quarter: result.quarter,
                processedUsers: result.count
            }
        });
    } catch (error) {
        next(error);
    }
};

const getCurrentQuarterInfo = async (req, res) => {
    const q = getQuarterRange(new Date());
    res.status(HTTP_STATUS.OK).json({
        success: true,
        data: q
    });
};

module.exports = {
    getQuarterlyKPI,
    getKPILeaderboard,
    getKPIAdminSummary,
    getKPITargets,
    saveKPITargets,
    recalculateKPI,
    getCurrentQuarterInfo
};
