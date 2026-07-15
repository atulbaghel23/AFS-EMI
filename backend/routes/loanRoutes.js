import express from 'express';
const router = express.Router();
import { getLoans, createLoan, updateLoan, approveLoan, approveSchedule, approveInvoice, downloadReceipt, downloadReport, downloadAgreement, getAgreementHTML, sendAgreementEmail, confirmDispatch, confirmCommission, lookupLoan } from '../controllers/loanController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/', protect, getLoans);
router.get('/lookup', protect, lookupLoan);
router.post('/', protect, createLoan);
router.put('/:id', protect, updateLoan);
router.post('/:id/approve', protect, approveLoan);
router.post('/:id/schedule', protect, approveSchedule);
router.post('/:id/invoice', protect, approveInvoice);
router.get('/:id/agreement/download', protect, downloadAgreement);
router.get('/:id/agreement/html', protect, getAgreementHTML);
router.post('/:id/agreement/send', protect, sendAgreementEmail);
router.post('/:id/dispatch', protect, confirmDispatch);
router.post('/:id/commission', protect, confirmCommission);
router.get('/:id/receipt/:installment', protect, downloadReceipt);
router.get('/:id/report/:format', protect, downloadReport);

export default router;
