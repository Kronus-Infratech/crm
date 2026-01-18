const prisma = require('../config/database');
const crypto = require('crypto');
const { HTTP_STATUS, ROLES } = require('../config/constants');
const { sendLeadAssignmentEmail, sendLeadWelcomeEmail, sendLeadFeedbackEmail } = require('../utils/emailUtils');
const { formatDate } = require('../utils/dateUtils');

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
          inventoryItem: {
            include: { project: { select: { name: true } } }
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

    // Filter financeNotes for non-authorized roles
    const authorizedRoles = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR];
    const userRoles = req.user.roles || [];
    const isAuthorized = userRoles.some(role => authorizedRoles.includes(role));

    if (!isAuthorized) {
      leads.forEach(l => delete l.financeNotes);
    }

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
        inventoryItem: {
          include: { project: { select: { name: true } } }
        }
      },
    });

    if (!lead) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Filter financeNotes for non-authorized roles
    const authorizedRoles = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR];
    const userRoles = req.user.roles || [];
    const isAuthorized = userRoles.some(role => authorizedRoles.includes(role));

    if (!isAuthorized) {
      delete lead.financeNotes;
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
      budgetFrom,
      budgetTo,
      followUpDate,
      dob,
      anniversaryDate,
      assignedToId,
      inventoryItemId,
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
        budgetFrom: budgetFrom || null,
        budgetTo: budgetTo || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        dob: dob ? new Date(dob) : null,
        anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
        createdById: req.user.id,
        assignedToId: assignedToId || null,
        inventoryItemId: inventoryItemId || null,
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

    // Send welcome email to lead if email is present
    if (lead.email) {
      sendLeadWelcomeEmail(lead.email, lead.name)
        .catch(err => console.error('Failed to send welcome email:', err));
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

    // Filter financeNotes if passed in body by non-authorized roles
    const authorizedRoles = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.DIRECTOR];
    const userRoles = req.user.roles || [];
    const isAuthorized = userRoles.some(role => authorizedRoles.includes(role));

    if (!isAuthorized && updateData.financeNotes !== undefined) {
      delete updateData.financeNotes;
    }

    // Handle empty strings for IDs and Dates before comparing changes
    ['assignedToId', 'inventoryItemId', 'dob', 'anniversaryDate', 'followUpDate', 'budgetFrom', 'budgetTo'].forEach(field => {
      if (updateData[field] === "") {
        updateData[field] = null;
      }
    });

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
      budgetFrom: 'Min Budget',
      budgetTo: 'Max Budget',
      property: 'Property',
      followUpDate: 'Follow-up Date',
      dob: 'Date of Birth',
      anniversaryDate: 'Anniversary Date'
    };

    if (updateData.followUpDate && updateData.followUpDate !== null) {
      updateData.followUpDate = new Date(updateData.followUpDate);
    }
    if (updateData.dob && updateData.dob !== null) {
      updateData.dob = new Date(updateData.dob);
    }
    if (updateData.anniversaryDate && updateData.anniversaryDate !== null) {
      updateData.anniversaryDate = new Date(updateData.anniversaryDate);
    }

    Object.keys(updateData).forEach(key => {
      if (trackedFields[key] && updateData[key] !== existingLead[key] && updateData[key] !== undefined) {
        // Handle potential nulls for display
        let oldVal = existingLead[key] || 'Empty';
        let newVal = updateData[key];

        // Format dates for better logs
        if (key === 'followUpDate' || key === 'dob' || key === 'anniversaryDate') {
          oldVal = existingLead[key] ? formatDate(existingLead[key]) : 'Empty';
          newVal = updateData[key] ? formatDate(updateData[key]) : 'Empty';
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

    // Generate feedback token if status changes to CONVERTED or NOT_CONVERTED
    if (
      updateData.status &&
      (updateData.status === 'CONVERTED' || updateData.status === 'NOT_CONVERTED') &&
      updateData.status !== existingLead.status
    ) {
      updateData.feedbackToken = crypto.randomUUID();
      updateData.feedbackSubmitted = false;
    }

    if (updateData.status === 'CONVERTED' && existingLead.status !== 'CONVERTED') {
      updateData.financeStatus = 'PENDING';
      // Auto-log activity for finance review
      updateData.activities = {
        create: {
          type: 'NOTE',
          title: 'Sent for Finance Approval',
          description: `Lead status changed to CONVERTED. Awaiting financial verification and final approval.`,
          userId: req.user.id
        }
      };
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

      // If status changed to CONVERTED or NOT_CONVERTED, send feedback email
      if (
        updateData.status &&
        (updateData.status === 'CONVERTED' || updateData.status === 'NOT_CONVERTED') &&
        updateData.status !== existingLead.status &&
        lead.email
      ) {
        sendLeadFeedbackEmail(lead.email, lead.name, updateData.status, lead.feedbackToken)
          .catch(err => console.error('Failed to send feedback email:', err));
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
    const isSalesman = req.user.roles.includes(ROLES.SALESMAN) && req.user.roles.length === 1;
    const isManager = req.user.roles.includes(ROLES.MANAGER) || req.user.roles.includes(ROLES.EXECUTIVE) || req.user.roles.includes(ROLES.DIRECTOR) || req.user.roles.includes(ROLES.ADMIN);
    const isAdmin = req.user.roles.includes(ROLES.ADMIN) || req.user.roles.includes(ROLES.DIRECTOR) || req.user.roles.includes(ROLES.EXECUTIVE);

    const where = {};

    // Base filtering based on role
    // Salesmen only see their own
    if (isSalesman) {
      where.OR = [
        { createdById: req.user.id },
        { assignedToId: req.user.id },
      ];
    }
    // Managers and Admins see everything for now, but we can refine this later if "Team" scope is added.
    // For now, if NOT a pure salesman, you see global stats.

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
          budgetTo: true,
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

    // Performance metrics for Managers/Admins
    let performance = [];
    let monthlyTrends = [];
    let valueBreakdown = { won: 0, lost: 0, pipeline: 0 };

    const allLeadsPromise = prisma.lead.findMany({
      where,
      select: {
        status: true,
        budgetFrom: true,
        budgetTo: true,
        createdAt: true,
      }
    });

    if (isManager) {
      const [users, allLeads] = await Promise.all([
        prisma.user.findMany({
          where: {
            roles: { hasSome: [ROLES.SALESMAN, ROLES.MANAGER] },
            isActive: true
          },
          select: {
            id: true,
            name: true,
            assignedLeads: {
              select: {
                status: true,
                budgetFrom: true,
                budgetTo: true,
                createdAt: true,
                feedbackRating: true
              },
            }
          }
        }),
        allLeadsPromise
      ]);

      // Calculate Performance per User (Team Metrics)
      performance = users.map(user => {
        const totalAssigned = user.assignedLeads.length;
        const wonLeads = user.assignedLeads.filter(l => l.status === 'CONVERTED').length;
        const lostLeads = user.assignedLeads.filter(l => l.status === 'NOT_CONVERTED').length;
        const pipelineValue = user.assignedLeads.reduce((sum, l) => sum + (l.budgetTo || 0), 0);

        const closeRate = totalAssigned > 0 ? ((wonLeads / totalAssigned) * 100).toFixed(1) : "0.0";
        const loseRate = totalAssigned > 0 ? ((lostLeads / totalAssigned) * 100).toFixed(1) : "0.0";


        const ratedLeads = user.assignedLeads.filter(l => l.feedbackRating !== null);
        const totalRating = ratedLeads.reduce((sum, l) => sum + l.feedbackRating, 0);
        const avgRating = ratedLeads.length > 0 ? (totalRating / ratedLeads.length).toFixed(1) : "N/A";

        return {
          userId: user.id,
          name: user.name,
          totalLeads: totalAssigned,
          wonLeads,
          lostLeads,
          closeRate,
          loseRate,
          pipelineValue,
          avgRating
        };
      }).sort((a, b) => b.totalLeads - a.totalLeads);

      // Process Trends and Breakdown for the leads in scope
      const { trends, breakdown } = processLeadAnalytics(allLeads);
      monthlyTrends = trends;
      valueBreakdown = breakdown;
    } else {
      // For Salesmen, just trends and breakdown for their own leads
      const allLeads = await allLeadsPromise;
      const { trends, breakdown } = processLeadAnalytics(allLeads);
      monthlyTrends = trends;
      valueBreakdown = breakdown;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        totalLeads,
        totalValue: totalEstimatedValue._sum.budgetTo || 0,
        leadsByStatus: statusStats,
        leadsByPriority: priorityStats,
        leadsBySource: sourceStats,
        performance: performance.length > 0 ? performance : undefined,
        monthlyTrends: monthlyTrends.length > 0 ? monthlyTrends : undefined,
        valueBreakdown: valueBreakdown
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper to process analytics from a lead list
const processLeadAnalytics = (leads) => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push(date.toLocaleString('en-US', { month: 'short' }));
  }

  const trendMap = months.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {});

  const breakdown = { won: 0, lost: 0, pipeline: 0 };

  leads.forEach(lead => {
    const month = new Date(lead.createdAt).toLocaleString('en-US', { month: 'short' });
    if (trendMap[month] !== undefined) {
      trendMap[month]++;
    }

    // Value Breakdown (Using Max Budget for Pipeline View)
    if (lead.status === 'CONVERTED') breakdown.won += (lead.budgetTo || 0);
    else if (lead.status === 'NOT_CONVERTED') breakdown.lost += (lead.budgetTo || 0);
    else breakdown.pipeline += (lead.budgetTo || 0);
  });

  const trends = Object.entries(trendMap).map(([month, count]) => ({ month, count }));

  return { trends, breakdown };
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

/**
 * @desc    Create lead from external source (99 Acres)
 * @route   POST /api/external/leads/99acres
 * @access  External (API Key)
 */
const createExternalLead = async (req, res, next) => {
  try {
    const { name, email, phone, property, value, description } = req.body;

    if (!name || !phone || !property) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Name, phone, and property are mandatory fields',
      });
    }

    // Find a default system user (first admin) to act as creator
    const systemUser = await prisma.user.findFirst({
      where: { roles: { has: ROLES.ADMIN } },
    });

    if (!systemUser) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'System configuration error: No admin user found',
      });
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name,
        email: email || null,
        phone,
        property,
        budgetFrom: value ? parseFloat(value) : null,
        budgetTo: value ? parseFloat(value) : null,
        source: 'NINETY_NINE_ACRES',
        status: 'NEW',
        priority: 'MEDIUM',
        createdById: systemUser.id,
        assignedToId: assignedUserId,
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        title: 'External Lead Ingested',
        description: `Lead automatically created via 99 Acres integration. ${description || ''}`,
        userId: systemUser.id,
        leadId: lead.id,
      },
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: lead,
      message: 'Lead ingested successfully from 99 Acres',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create lead from external source (MagicBricks)
 * @route   POST /api/external/leads/magicbricks
 * @access  External (API Key)
 */
const createMagicBricksLead = async (req, res, next) => {
  try {
    // Flexible payload handling. 
    // We look for common field names.
    const body = req.body;

    const name = body.name || body.username || body.contactName;
    const phone = body.phone || body.mobile || body.contactNumber || body.phoneNumber;
    const email = body.email || body.contactEmail;
    const property = body.property || body.project || body.society || body.locality || 'MagicBricks Lead';
    const value = body.value || body.budget || body.price;
    const description = body.description || body.message || body.notes;

    if (!name || !phone) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Name and Phone are mandatory fields',
      });
    }

    // Find a default system user (first admin)
    const systemUser = await prisma.user.findFirst({
      where: { roles: { has: ROLES.ADMIN } },
    });

    if (!systemUser) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'System configuration error: No admin user found',
      });
    }

    // --- Round Robin Auto-Assignment Logic ---
    let assignedUserId = null;
    let assignedUserName = null;
    let assignedUserEmail = null;

    try {
      // Find all active salesmen
      const salesmen = await prisma.user.findMany({
        where: {
          roles: { has: 'SALESMAN' },
          isActive: true
        },
        orderBy: {
          lastAssignedAt: 'asc' // The one who hasn't been assigned for the longest time comes first (or nulls)
        }
      });

      if (salesmen.length > 0) {
        const selectedSalesman = salesmen[0]; // Pick the first one
        assignedUserId = selectedSalesman.id;
        assignedUserName = selectedSalesman.name;
        assignedUserEmail = selectedSalesman.email;

        // Update timestamp to move them to back of the queue
        await prisma.user.update({
          where: { id: assignedUserId },
          data: { lastAssignedAt: new Date() }
        });

        console.log(`Auto-assigned lead to: ${assignedUserName} (${assignedUserId})`);
      } else {
        console.warn('No active salesmen found for auto-assignment.');
      }
    } catch (assignError) {
      console.error("Auto-assignment failed:", assignError);
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name,
        email: email || null,
        phone,
        property,
        budgetFrom: value ? parseFloat(value) : null,
        budgetTo: value ? parseFloat(value) : null,
        source: 'MAGICBRICKS',
        status: 'NEW',
        priority: 'MEDIUM',
        createdById: systemUser.id,
        assignedToId: assignedUserId, // Assign found salesman
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        title: 'External Lead Ingested',
        description: `Lead automatically created from MagicBricks. ${description || ''}`,
        userId: systemUser.id,
        leadId: lead.id,
      },
    });

    if (assignedUserId && assignedUserEmail) {
      // Log assignment activity
      await prisma.activity.create({
        data: {
          type: 'NOTE',
          title: 'Auto-Assigned (Round Robin)',
          description: `Lead auto-assigned to ${assignedUserName}`,
          userId: systemUser.id,
          leadId: lead.id
        }
      });

      // Send Email Notification
      const { sendLeadAssignmentEmail } = require('../utils/emailService');
      sendLeadAssignmentEmail(
        assignedUserEmail,
        assignedUserName,
        lead.name,
        lead.id
      ).catch(err => console.error('Failed to send auto-assignment email:', err));
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: lead,
      message: 'Lead received successfully',
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
  createExternalLead,
  createMagicBricksLead,
};
