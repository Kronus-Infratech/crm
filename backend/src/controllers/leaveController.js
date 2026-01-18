const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Apply for leave
 * @route   POST /api/leaves
 * @access  Private
 */
const applyLeave = async (req, res, next) => {
    try {
        const { startDate, endDate, type, reason } = req.body;

        if (!startDate || !endDate || !reason) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Please provide start date, end date and reason'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Start date cannot be after end date'
            });
        }

        // Check for overlapping leaves (PENDING or APPROVED)
        const overlappingLeave = await prisma.leave.findFirst({
            where: {
                userId: req.user.id,
                status: { in: ['PENDING', 'APPROVED'] },
                AND: [
                    { startDate: { lte: end } },
                    { endDate: { gte: start } }
                ]
            }
        });

        if (overlappingLeave) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: `Overlap detected: You already have a ${overlappingLeave.status.toLowerCase()} leave request for these dates.`
            });
        }

        const leave = await prisma.leave.create({
            data: {
                userId: req.user.id,
                startDate: start,
                endDate: end,
                type: type || 'CASUAL',
                reason,
                status: 'PENDING'
            }
        });

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get my leaves
 * @route   GET /api/leaves/my
 * @access  Private
 */
const getMyLeaves = async (req, res, next) => {
    try {
        const leaves = await prisma.leave.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: leaves
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all leaves (HR/Admin only)
 * @route   GET /api/leaves
 * @access  Private (HR/Admin)
 */
const getAllLeaves = async (req, res, next) => {
    try {
        const { status, userId } = req.query;

        const where = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;

        const leaves = await prisma.leave.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        designation: true
                    }
                },
                approvedBy: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: leaves
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update leave status (HR/Admin only)
 * @route   PUT /api/leaves/:id/status
 * @access  Private (HR/Admin)
 */
const updateLeaveStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Invalid status. Must be APPROVED or REJECTED'
            });
        }

        const leave = await prisma.leave.findUnique({ where: { id } });

        if (!leave) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        const updatedLeave = await prisma.leave.update({
            where: { id },
            data: {
                status,
                rejectionReason: status === 'REJECTED' ? rejectionReason : null,
                approvedById: req.user.id
            }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: updatedLeave
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get leave analytics/report (HR/Admin only)
 * @route   GET /api/leaves/reports
 * @access  Private (HR/Admin)
 */
const getLeaveReports = async (req, res, next) => {
    try {
        // Get total leaves summary
        const summary = await prisma.leave.groupBy({
            by: ['status'],
            _count: true
        });

        // Get leaves by user for report
        const userLeaves = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                department: true,
                designation: true,
                leaves: {
                    select: {
                        status: true,
                        type: true,
                        startDate: true,
                        endDate: true
                    }
                }
            }
        });

        const report = userLeaves.map(user => {
            const total = user.leaves.length;
            const approved = user.leaves.filter(l => l.status === 'APPROVED').length;
            const pending = user.leaves.filter(l => l.status === 'PENDING').length;

            // Calculate days for approved leaves
            const approvedDays = user.leaves
                .filter(l => l.status === 'APPROVED')
                .reduce((sum, l) => {
                    const diff = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                    return sum + diff;
                }, 0);

            return {
                id: user.id,
                name: user.name,
                department: user.department,
                designation: user.designation,
                totalRequests: total,
                approvedRequests: approved,
                pendingRequests: pending,
                totalApprovedDays: approvedDays
            };
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                summary,
                employeeReports: report
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveReports
};
