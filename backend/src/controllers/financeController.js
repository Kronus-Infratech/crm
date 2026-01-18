const prisma = require('../config/database');
const { HTTP_STATUS, ROLES } = require('../config/constants');

/**
 * @desc    Get all transactions
 * @route   GET /api/finance/transactions
 * @access  Private (Executive/Director/Admin)
 */
const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, source } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(type && { type }),
      ...(source && { source: { contains: source, mode: 'insensitive' } }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: 'desc' },
        include: {
          handledBy: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/finance/transactions
 * @access  Private (Executive/Director/Admin)
 */
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, source, description, date } = req.body;

    if (!type || !amount || !source) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Type, amount, and source are required'
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        source,
        description,
        date: date ? new Date(date) : new Date(),
        handledById: req.user.id
      },
      include: {
        handledBy: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: transaction,
      message: 'Transaction recorded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leads pending finance approval
 * @route   GET /api/finance/approvals
 * @access  Private (Executive/Director/Admin)
 */
const getPendingApprovals = async (req, res, next) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        status: 'CONVERTED',
        financeStatus: 'PENDING'
      },
      include: {
        assignedTo: { select: { name: true } },
        inventoryItem: {
          include: { project: { select: { name: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject a lead sale
 * @route   PATCH /api/finance/approvals/:id
 * @access  Private (Executive/Director/Admin)
 */
const handleApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, financeNotes } = req.body; // status: APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid status. Must be APPROVED or REJECTED'
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { inventoryItem: true }
    });

    if (!lead) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Update Lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        financeStatus: status,
        financeNotes: financeNotes || lead.financeNotes
      }
    });

    // If rejected, re-open the lead and log rejection
    if (status === 'REJECTED') {
      await prisma.lead.update({
        where: { id },
        data: {
          status: 'NEGOTIATION', // Re-open the lead
          activities: {
            create: {
              type: 'NOTE',
              title: 'Finance Rejected Sale',
              description: `Lead sale was rejected by finance. Reason: ${financeNotes || 'No specific reason provided.'}. Lead status reset to Negotiation.`,
              userId: req.user.id
            }
          }
        }
      });
    }

    // If approved and has inventory item, mark inventory as SOLD
    if (status === 'APPROVED') {
      // Log approval activity
      await prisma.lead.update({
        where: { id },
        data: {
          activities: {
            create: {
              type: 'NOTE',
              title: 'Finance Approved Sale',
              description: `Lead sale was approved by finance. ${financeNotes ? `Notes: ${financeNotes}` : ''}`,
              userId: req.user.id
            }
          }
        }
      });

      if (lead.inventoryItemId) {
        await prisma.inventoryItem.update({
          where: { id: lead.inventoryItemId },
          data: {
            status: 'SOLD',
            soldTo: lead.name,
            soldDate: new Date()
          }
        });

        // Create a credit transaction automatically
        await prisma.transaction.create({
          data: {
            type: 'CREDIT',
            amount: lead.budgetTo || 0,
            source: `Sale: ${lead.name}`,
            description: `Plot ${lead.inventoryItem?.plotNumber || ''} sold via Lead ${lead.id}`,
            handledById: req.user.id
          }
        });
      }
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updatedLead,
      message: `Lead sale ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  getPendingApprovals,
  handleApproval
};
