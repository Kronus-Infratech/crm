const prisma = require('../config/database');
const { HTTP_STATUS, ROLES } = require('../config/constants');

/**
 * @desc    Get ledger data for a lead
 * @route   GET /api/ledger/:leadId
 * @access  Private
 */
const getLedger = async (req, res, next) => {
    try {
        const { leadId } = req.params;

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                paymentLedgerEntries: {
                    include: {
                        uploader: { select: { name: true } },
                        verifiedBy: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                documentLedgerEntries: {
                    include: {
                        uploader: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!lead) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: lead
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update ledger basic info (Amount, Timeline)
 * @route   PATCH /api/ledger/:leadId/info
 * @access  Private (Salesman/Admin)
 */
const updateLedgerInfo = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        const { totalAmountToCredit, paymentTimeline } = req.body;

        const lead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                paymentTimeline
            }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: lead
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add payment ledger entry
 * @route   POST /api/ledger/:leadId/payment
 * @access  Private (Salesman/Admin)
 */
const addPaymentEntry = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        const { amount, note, attachmentUrl, attachmentType } = req.body;

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (lead.paymentLedgerClosedAt) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Payment ledger is closed. No more entries can be added.'
            });
        }

        const entryAmount = parseFloat(amount) || 0;
        const entry = await prisma.paymentLedgerEntry.create({
            data: {
                leadId,
                amount: entryAmount,
                note,
                attachmentUrl,
                attachmentType,
                uploaderId: req.user.id
            }
        });

        // We no longer increment here. It will happen on approval.

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: entry
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify payment entry (Approve/Reject)
 * @route   PATCH /api/ledger/payment/:entryId/verify
 * @access  Private (Finance)
 */
const verifyPaymentEntry = async (req, res, next) => {
    try {
        const { entryId } = req.params;
        const { status, financeNotes } = req.body;

        if (status === 'REJECTED' && (!financeNotes || financeNotes.trim() === '')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'A note is mandatory when rejecting a payment entry'
            });
        }

        if (!req.user.roles.includes(ROLES.FINANCE) && !req.user.roles.includes(ROLES.ADMIN)) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Only Finance department can verify payments'
            });
        }

        const entry = await prisma.paymentLedgerEntry.findUnique({
            where: { id: entryId }
        });

        if (!entry) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Payment entry not found'
            });
        }

        // Only update lead total if this is a NEW approval
        if (status === 'APPROVED' && entry.status !== 'APPROVED') {
            await prisma.lead.update({
                where: { id: entry.leadId },
                data: {
                    totalAmountToCredit: {
                        increment: entry.amount
                    }
                }
            });
        } else if (status === 'REJECTED' && entry.status === 'APPROVED') {
            // If it was already approved and now being rejected (correction), decrement
            await prisma.lead.update({
                where: { id: entry.leadId },
                data: {
                    totalAmountToCredit: {
                        decrement: entry.amount
                    }
                }
            });
        }

        const updatedEntry = await prisma.paymentLedgerEntry.update({
            where: { id: entryId },
            data: {
                status,
                financeNotes,
                verifiedById: req.user.id,
                verifiedAt: new Date()
            }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: entry
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add document ledger entry
 * @route   POST /api/ledger/:leadId/document
 * @access  Private
 */
const addDocumentEntry = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        const { note, attachmentUrl, attachmentType } = req.body;

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (lead.documentLedgerClosedAt) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Document ledger is closed. No more records can be added.'
            });
        }

        const entry = await prisma.documentLedgerEntry.create({
            data: {
                leadId,
                note,
                attachmentUrl,
                attachmentType,
                uploaderId: req.user.id
            }
        });

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: entry
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Approve document entry
 * @route   PATCH /api/ledger/document/:entryId/approve
 * @access  Private
 */
const approveDocumentEntry = async (req, res, next) => {
    try {
        const { entryId } = req.params;
        const { status, notes } = req.body; // status: APPROVED or REJECTED
        const isFinance = req.user.roles.includes(ROLES.FINANCE) || req.user.roles.includes(ROLES.ADMIN);
        const isSales = req.user.roles.includes(ROLES.SALESMAN) || req.user.roles.includes(ROLES.ADMIN);

        if (status === 'REJECTED' && (!notes || notes.trim() === '')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'A note is mandatory when rejecting a document entry'
            });
        }

        const updateData = {};
        if (status === 'REJECTED') {
            updateData.status = 'REJECTED';
            if (isFinance) {
                updateData.financeNotes = notes;
                updateData.financeApproved = false; // Reset if it was approved
            } else if (isSales) {
                updateData.salesNotes = notes;
                updateData.salesApproved = false; // Reset if it was approved
            }
        } else {
            // approving
            if (isFinance) {
                updateData.financeApproved = true;
                updateData.financeApprovedBy = req.user.id;
                updateData.financeApprovedAt = new Date();
                updateData.financeNotes = notes || null;
            } else if (isSales) {
                updateData.salesApproved = true;
                updateData.salesApprovedBy = req.user.id;
                updateData.salesApprovedAt = new Date();
                updateData.salesNotes = notes || null;
            }

            // If it's a dual approval and this was the second one, mark overall status as APPROVED
            // We'll need to fetch the current entry first to check other side
            const currentEntry = await prisma.documentLedgerEntry.findUnique({ where: { id: entryId } });
            if ((isFinance && currentEntry.salesApproved) || (isSales && currentEntry.financeApproved)) {
                updateData.status = 'APPROVED';
            }
        }

        const entry = await prisma.documentLedgerEntry.update({
            where: { id: entryId },
            data: updateData
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: entry
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Handle ledger closure steps
 * @route   PATCH /api/ledger/:leadId/close
 * @access  Private
 */
const handleLedgerClosure = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        const { type, notes } = req.body; // type: 'PAYMENT' or 'DOCUMENT'
        const isFinance = req.user.roles.includes(ROLES.FINANCE) || req.user.roles.includes(ROLES.ADMIN);
        const isSales = req.user.roles.includes(ROLES.SALESMAN) || req.user.roles.includes(ROLES.ADMIN);

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                paymentLedgerEntries: true,
                documentLedgerEntries: true
            }
        });

        // Check if all entries are approved before closure
        if (type === 'PAYMENT') {
            const allApproved = lead.paymentLedgerEntries.every(e => e.status === 'APPROVED');
            if (!allApproved) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'All payment entries must be approved before closure'
                });
            }

            const updateData = { paymentLedgerClosureNotes: notes };
            if (isSales) {
                updateData.paymentLedgerClosedBySalesId = req.user.id;
            }
            if (isFinance && lead.paymentLedgerClosedBySalesId) {
                updateData.paymentLedgerClosedByFinanceId = req.user.id;
                updateData.paymentLedgerClosedAt = new Date();
            }

            await prisma.lead.update({ where: { id: leadId }, data: updateData });
        } else if (type === 'DOCUMENT') {
            const allApproved = lead.documentLedgerEntries.every(e => e.salesApproved && e.financeApproved);
            if (!allApproved) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'All document entries must be dual-approved before closure'
                });
            }

            const updateData = { documentLedgerClosureNotes: notes };
            if (isSales) {
                updateData.documentLedgerClosedBySalesId = req.user.id;
            }
            if (isFinance && lead.documentLedgerClosedBySalesId) {
                updateData.documentLedgerClosedByFinanceId = req.user.id;
                updateData.documentLedgerClosedAt = new Date();
            }

            await prisma.lead.update({ where: { id: leadId }, data: updateData });
        }

        // Final check: if both ledgers are closed, set overall status to CLOSED
        const updatedLead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (updatedLead.paymentLedgerClosedAt && updatedLead.documentLedgerClosedAt) {
            await prisma.lead.update({
                where: { id: leadId },
                data: { ledgerStatus: 'CLOSED' }
            });
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Closure step recorded successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLedger,
    updateLedgerInfo,
    addPaymentEntry,
    verifyPaymentEntry,
    addDocumentEntry,
    approveDocumentEntry,
    handleLedgerClosure
};
