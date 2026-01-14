const prisma = require('../config/database');
const { HTTP_STATUS, ROLES } = require('../config/constants');

/**
 * @desc    Get all events
 * @route   GET /api/events
 * @access  Private
 */
const getEvents = async (req, res, next) => {
    try {
        const { startDate, endDate, userId } = req.query;

        const where = {
            ...(startDate && endDate && {
                start: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            }),
        };

        // RBAC: Admins/Executives/Directors can see all, others see only their own
        const authorizedRoles = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR];
        const isAuthorized = req.user.roles.some(role => authorizedRoles.includes(role));

        if (!isAuthorized) {
            where.userId = req.user.id;
        } else if (userId) {
            where.userId = userId;
        }

        const events = await prisma.event.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                lead: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: {
                start: 'asc',
            },
        });

        // Also fetch lead follow-ups as virtual events if requested
        let followUps = [];
        if (startDate && endDate) {
            const leadWhere = {
                followUpDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                }
            };

            if (!isAuthorized) {
                leadWhere.assignedToId = req.user.id;
            } else if (userId) {
                leadWhere.assignedToId = userId;
            }

            const leads = await prisma.lead.findMany({
                where: leadWhere,
                select: {
                    id: true,
                    name: true,
                    followUpDate: true,
                    property: true,
                    assignedTo: {
                        select: { name: true }
                    }
                }
            });

            followUps = leads.map(lead => ({
                id: `followup-${lead.id}`,
                title: `Follow-up: ${lead.name}`,
                description: `Property: ${lead.property}`,
                start: lead.followUpDate,
                end: lead.followUpDate,
                allDay: false,
                type: 'FOLLOW_UP',
                leadId: lead.id,
                userName: lead.assignedTo?.name
            }));
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: [...events, ...followUps],
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new event
 * @route   POST /api/events
 * @access  Private
 */
const createEvent = async (req, res, next) => {
    try {
        const { title, description, start, end, allDay, type, leadId } = req.body;

        const event = await prisma.event.create({
            data: {
                title,
                description,
                start: new Date(start),
                end: new Date(end),
                allDay: allDay || false,
                type: type || 'EVENT',
                userId: req.user.id,
                leadId: leadId || null,
            },
            include: {
                user: {
                    select: { name: true }
                }
            }
        });

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: event,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update event
 * @route   PUT /api/events/:id
 * @access  Private
 */
const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, start, end, allDay, type, leadId } = req.body;

        // Check if event exists and if user is authorized to edit it
        const existingEvent = await prisma.event.findUnique({
            where: { id },
        });

        if (!existingEvent) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Event not found',
            });
        }

        // Only owner or admin can edit
        const isAdmin = req.user.roles.includes(ROLES.ADMIN);
        if (existingEvent.userId !== req.user.id && !isAdmin) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Not authorized to edit this event',
            });
        }

        const event = await prisma.event.update({
            where: { id },
            data: {
                title,
                description,
                start: start ? new Date(start) : undefined,
                end: end ? new Date(end) : undefined,
                allDay,
                type,
                leadId: leadId || null,
            },
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: event,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete event
 * @route   DELETE /api/events/:id
 * @access  Private
 */
const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existingEvent = await prisma.event.findUnique({
            where: { id },
        });

        if (!existingEvent) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Event not found',
            });
        }

        const isAdmin = req.user.roles.includes(ROLES.ADMIN);
        if (existingEvent.userId !== req.user.id && !isAdmin) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Not authorized to delete this event',
            });
        }

        await prisma.event.delete({
            where: { id },
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
};
