import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import {
  generateGlobalExcelReport,
  generateGlobalPPTReport,
  generateGlobalPDFReport
} from '../services/reportService.js';

export const downloadGlobalReport = async (req, res) => {
  try {
    const { format } = req.params;
    let { selectedAssets, dateRange } = req.body;

    if (!selectedAssets) selectedAssets = [];
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return res.status(400).json({ message: 'Valid dateRange is required for the global report protocol' });
    }

    // Fetch all relevant data
    const loans = await Loan.find().populate('customerId');
    const payments = await Payment.find().populate({
      path: 'loanId',
      populate: { path: 'customerId' }
    });

    const approvedLoans = loans.filter(l => ['Approved', 'Active'].includes(l.approvalStatus));
    const getLoanLabel = (l) => `${l.machineName} (${l.invoiceNumber || l._id.toString().substring(l._id.toString().length - 4)})`;

    // Filtering Logic
    const filteredLoans = selectedAssets.includes('ALL MACHINES')
      ? approvedLoans
      : approvedLoans.filter(l => selectedAssets.includes(getLoanLabel(l)));

    const filteredPayments = payments.filter(p => {
      const paymentDate = new Date(p.date);
      const inDateRange = paymentDate >= new Date(dateRange.start) && paymentDate <= new Date(dateRange.end);

      if (selectedAssets.includes('ALL MACHINES')) return inDateRange;

      const associatedLoan = approvedLoans.find(l => l._id.toString() === (p.loanId?._id || p.loanId)?.toString());
      return inDateRange && associatedLoan && selectedAssets.includes(getLoanLabel(associatedLoan));
    });
    // Generate Month Objects for calculation
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const months = [];
    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while (curr <= end) {
      months.push({
        month: curr.toLocaleString('default', { month: 'short' }).toUpperCase(),
        start: new Date(curr.getFullYear(), curr.getMonth(), 1),
        end: new Date(curr.getFullYear(), curr.getMonth() + 1, 0)
      });
      curr.setMonth(curr.getMonth() + 1);
    }

    let reportBuffer;
    let contentType;

    if (format === 'excel') {
      reportBuffer = await generateGlobalExcelReport(filteredLoans, filteredPayments, months);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (format === 'ppt') {
      reportBuffer = await generateGlobalPPTReport(filteredLoans, filteredPayments, months);
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (format === 'pdf') {
      reportBuffer = await generateGlobalPDFReport(filteredLoans, filteredPayments, months);
      contentType = 'application/pdf';
    } else {
      return res.status(400).json({ message: 'Invalid report format protocol' });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=Global_Strategic_Report.${format === 'excel' ? 'xlsx' : (format === 'ppt' ? 'pptx' : 'pdf')}`
    });

    res.send(reportBuffer);
  } catch (error) {
    console.error('Global Report Error:', error);
    res.status(500).json({ message: 'Failed to synthesize global report protocol', error: error.message });
  }
};
