import express from 'express';
const router = express.Router();
import { getLoans, getLoanDetails, createLoan, updateLoan, approveLoan, approveSchedule, approveInvoice, downloadReceipt, downloadReport, downloadAgreement, getAgreementHTML, sendAgreementEmail, confirmDispatch, confirmCommission } from '../../controllers/app/loanController.js';
import { protect } from '../../middleware/authMiddleware.js';

router.get('/emidetails', protect, getLoanDetails);
router.get('/', protect, getLoans);
router.get('/:id', protect, getLoanDetails);
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
