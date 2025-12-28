const prisma = require('../config/database');
const { HTTP_STATUS, ROLES } = require('../config/constants');
const { sendLeadAssignmentEmail } = require('../utils/emailUtils');

/**
 * @desc    Get all leads (with pagination, search, and filters)
 * @route   GET /api/leads
 * @access  Private
 */
const getLeads = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      priority,
      source,
      assignedToId,
      createdById,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { property: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(source && { source }),
      ...(assignedToId && { assignedToId }),
      ...(createdById && { createdById }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    // Non-admin users can only see their created or assigned leads
    if (!req.user.roles.includes(ROLES.ADMIN)) {
      where.OR = [
        { createdById: req.user.id },
        { assignedToId: req.user.id },
      ];
    }

    // Get leads with pagination
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              activities: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single lead by ID
 * @route   GET /api/leads/:id
 * @access  Private
 */
const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activities: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        documents: true, // Fetch attached documents
      },
    });

    if (!lead) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check access permission
    if (
      !req.user.roles.includes(ROLES.ADMIN) &&
      lead.createdById !== req.user.id &&
      lead.assignedToId !== req.user.id
    ) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'You do not have permission to access this lead',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new lead
 * @route   POST /api/leads
 * @access  Private
 */
const createLead = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      property,
      source,
      status,
      priority,
      value,
      followUpDate,
      assignedToId,
      documents = [] // Expecting array of { name, url, type, size }
    } = req.body;

    // If assignedToId is provided, verify the user exists
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Assigned user not found',
        });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email: email || null,
        phone,
        property: property || null,
        source: source || 'WEBSITE',
        status: status || 'NEW',
        priority: priority || 'MEDIUM',
        value: value || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        createdById: req.user.id,
        assignedToId: assignedToId || null,
        documents: {
          create: documents.map(doc => ({
            name: doc.name,
            url: doc.url,
            type: doc.type,
            size: doc.size
          }))
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create activity for lead creation
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        title: 'Lead Created',
        description: `Lead created by ${req.user.name}`,
        userId: req.user.id,
        leadId: lead.id,
      },
    });

    // Send email to assignee if assigned
    if (lead.assignedTo) {
      sendLeadAssignmentEmail(
        lead.assignedTo.email,
        lead.assignedTo.name,
        lead.name,
        lead.id
      ).catch(err => console.error('Failed to send assignment email:', err));
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update lead
 * @route   PUT /api/leads/:id
 * @access  Private
 */
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    // EXTRACT activityNote and documents so they are NOT passed to Prisma update directly
    const { activityNote, documents, ...updateData } = req.body;

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check access permission
    if (
      !req.user.roles.includes(ROLES.ADMIN) &&
      existingLead.createdById !== req.user.id &&
      existingLead.assignedToId !== req.user.id
    ) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'You do not have permission to update this lead',
      });
    }

    // Generate detailed logs by comparing changes
    const changes = [];

    // List of fields to track for activity log
    const trackedFields = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
      priority: 'Priority',
      value: 'Value',
      property: 'Property',
      followUpDate: 'Follow-up Date'
    };

    if (updateData.followUpDate) {
      updateData.followUpDate = new Date(updateData.followUpDate);
    }

    Object.keys(updateData).forEach(key => {
      if (trackedFields[key] && updateData[key] !== existingLead[key] && updateData[key] !== undefined) {
        // Handle potential nulls for display
        let oldVal = existingLead[key] || 'Empty';
        let newVal = updateData[key];

        // Format dates for better logs
        if (key === 'followUpDate') {
          oldVal = existingLead[key] ? new Date(existingLead[key]).toLocaleDateString() : 'Empty';
          newVal = updateData[key] ? new Date(updateData[key]).toLocaleDateString() : 'Empty';
        }

        changes.push(`${trackedFields[key]} changed from "${oldVal}" to "${newVal}"`);
      }
    });

    // If assignedToId is being updated, verify the user exists
    if (updateData.assignedToId && updateData.assignedToId !== existingLead.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: updateData.assignedToId },
      });

      if (!assignedUser) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Assigned user not found',
        });
      }
      changes.push(`Assigned to ${assignedUser.name}`);
    }

    // Update lead in Database
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData, // This now excludes activityNote
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create documents if provided (for adding attachments to existing leads)
    if (documents && Array.isArray(documents) && documents.length > 0) {
      await prisma.document.createMany({
        data: documents.map(doc => ({
          name: doc.name,
          url: doc.url,
          type: doc.type,
          size: doc.size,
          leadId: lead.id
        }))
      });

      // Add to activity log (BEFORE creating the activity)
      const fileNames = documents.map(d => d.name).join(', ');
      changes.push(`Added ${documents.length} attachment(s): ${fileNames}`);
    }

    // Create activity for SYSTEM changes (excluding manual notes)
    if (changes.length > 0) {
      await prisma.activity.create({
        data: {
          type: 'NOTE',
          title: 'Lead Updated',
          description: changes.join(', '),
          userId: req.user.id,
          leadId: lead.id,
        },
      });

      // If assigned user changed, send email
      if (updateData.assignedToId && updateData.assignedToId !== existingLead.assignedToId) {
        sendLeadAssignmentEmail(
          lead.assignedTo.email,
          lead.assignedTo.name,
          lead.name,
          lead.id
        ).catch(err => console.error('Failed to send assignment email:', err));
      }
    }

    // Create SEPARATE activity for USER NOTE (if provided)
    if (activityNote) {
      await prisma.activity.create({
        data: {
          type: 'NOTE',
          title: 'Note Added', // Specific title for notes
          description: activityNote,
          userId: req.user.id,
          leadId: lead.id,
        },
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Lead updated successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete lead
 * @route   DELETE /api/leads/:id
 * @access  Private (Admin only)
 */
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Explicitly delete related records first to avoid constraint issues in MongoDB if Prisma cascade fails
    await Promise.all([
        prisma.activity.deleteMany({ where: { leadId: id } }),
        prisma.document.deleteMany({ where: { leadId: id } })
    ]);

    // Finally delete the lead
    await prisma.lead.delete({
      where: { id },
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Lead deletion failed:', error);
    next(error);
  }
};

/**
 * @desc    Get lead statistics
 * @route   GET /api/leads/stats
 * @access  Private
 */
const getLeadStats = async (req, res, next) => {
  try {
    const where = {};

    // Non-admin users can only see their stats
    if (!req.user.roles.includes(ROLES.ADMIN)) {
      where.OR = [
        { createdById: req.user.id },
        { assignedToId: req.user.id },
      ];
    }

    const [
      totalLeads,
      leadsByStatus,
      leadsByPriority,
      leadsBySource,
      totalEstimatedValue,
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: true,
        where,
      }),
      prisma.lead.groupBy({
        by: ['priority'],
        _count: true,
        where,
      }),
      prisma.lead.groupBy({
        by: ['source'],
        _count: true,
        where,
      }),
      prisma.lead.aggregate({
        _sum: {
          value: true,
        },
        where,
      }),
    ]);

    const statusStats = leadsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {});

    const priorityStats = leadsByPriority.reduce((acc, curr) => {
      acc[curr.priority] = curr._count;
      return acc;
    }, {});

    const sourceStats = leadsBySource.reduce((acc, curr) => {
      acc[curr.source] = curr._count;
      return acc;
    }, {});

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        totalLeads,
        totalValue: totalEstimatedValue._sum.value || 0,
        leadsByStatus: statusStats,
        leadsByPriority: priorityStats,
        leadsBySource: sourceStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign lead to user
 * @route   PUT /api/leads/:id/assign
 * @access  Private (Admin, Manager)
 */
const assignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Verify assigned user exists
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Assigned user not found',
        });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { assignedToId: assignedToId || null },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        title: 'Lead Assigned',
        description: assignedToId
          ? `Lead assigned to ${updatedLead.assignedTo.name}`
          : 'Lead unassigned',
        userId: req.user.id,
        leadId: lead.id,
      },
    });

    // Send email to assignee
    if (assignedToId && updatedLead.assignedTo) {
      sendLeadAssignmentEmail(
        updatedLead.assignedTo.email,
        updatedLead.assignedTo.name,
        updatedLead.name,
        updatedLead.id
      ).catch(err => console.error('Failed to send assignment email:', err));
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Lead assignment updated successfully',
      data: updatedLead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        lead: true
      }
    });

    if (!document) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check access permission
    if (
      !req.user.roles.includes(ROLES.ADMIN) &&
      document.lead.createdById !== req.user.id &&
      document.lead.assignedToId !== req.user.id
    ) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'You do not have permission to delete this document',
      });
    }

    // Delete document from database
    await prisma.document.delete({
      where: { id },
    });

    // Log the deletion
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        title: 'Lead Updated',
        description: `Deleted attachment: ${document.name}`,
        userId: req.user.id,
        leadId: document.leadId,
      },
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  assignLead,
  deleteDocument,
};
