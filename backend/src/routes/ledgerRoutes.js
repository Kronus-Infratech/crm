const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:leadId', ledgerController.getLedger);
router.patch('/:leadId/info', ledgerController.updateLedgerInfo);
router.post('/:leadId/payment', ledgerController.addPaymentEntry);
router.patch('/payment/:entryId/verify', ledgerController.verifyPaymentEntry);
router.post('/:leadId/document', ledgerController.addDocumentEntry);
router.patch('/document/:entryId/approve', ledgerController.approveDocumentEntry);
router.patch('/:leadId/close', ledgerController.handleLedgerClosure);

module.exports = router;
