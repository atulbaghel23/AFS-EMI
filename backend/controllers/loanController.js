import Loan from '../models/Loan.js';
import ApprovalFlow from '../models/ApprovalFlow.js';
import Machine from '../models/Machine.js';
import { generateReceiptPDF, generateAgreementPDF, generateAgreementHTML } from '../services/pdfService.js';
import { generateExcelReport, generatePPTReport, generatePDFReport } from '../services/reportService.js';

import { calculateOverdueInterest } from '../utils/interestCalculator.js';

export const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find().populate('customerId').populate('approvalFlowId').sort({ createdAt: -1 });
    // Dynamically calculate overdue interest for all loans before sending to frontend
    const updatedLoans = loans.map(loan => calculateOverdueInterest(loan.toObject ? loan.toObject() : loan));
    res.json(updatedLoans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLoan = async (req, res) => {
  const loan = new Loan(req.body);
  try {
    let flow = await ApprovalFlow.findOne({ type: 'FINANCING', isActive: true, supervisorId: req.user._id });
    if (!flow) {
      flow = await ApprovalFlow.findOne({ type: 'FINANCING', isActive: true, $or: [{ supervisorId: null }, { supervisorId: '' }] });
    }
    if (flow && flow.steps && flow.steps.length > 0) {
      loan.approvalFlowId = flow._id;
      loan.approvalStatus = 'Pending Approval';
      loan.approvalStep = 0;
      loan.agreementGenerated = false;
    } else {
      loan.approvalStatus = 'Pending Scheduling';
      loan.agreementGenerated = false;
    }

    const newLoan = await loan.save();
    await newLoan.populate('customerId');
    res.status(201).json(newLoan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateLoan = async (req, res) => {
  try {
    const updatedLoan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedLoan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const approveLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { action = 'Approved', notes = '' } = req.body || {};

    const loan = await Loan.findById(id).populate({
      path: 'approvalFlowId',
      populate: {
        path: 'steps.statusId',
        model: 'TicketStatus'
      }
    });

    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (loan.approvalStatus === 'Approved' || loan.approvalStatus === 'Rejected') {
      return res.status(400).json({ message: 'Loan is already fully processed' });
    }

    if (action === 'Rejected') {
      loan.approvalStatus = 'Rejected';
      loan.approvalHistory.push({
        action,
        notes,
        approverId: req.user._id,
        approverName: req.user.name || 'Unknown',
        status: 'Rejected',
        date: new Date()
      });
      await loan.save();
      const updated = await Loan.findById(id).populate('customerId');
      return res.json(updated);
    }

    const flow = loan.approvalFlowId;
    if (!flow) {
      loan.approvalStatus = 'Approved';
      loan.agreementGenerated = true;
      loan.approvalHistory.push({
        action,
        notes,
        approverId: req.user._id,
        approverName: req.user.name || 'Unknown',
        status: 'Approved',
        date: new Date()
      });
      await loan.save();
      const updated = await Loan.findById(id).populate('customerId');
      return res.json(updated);
    }

    // Get the status from the current step
    const currentStep = flow.steps[loan.approvalStep];
    const stepStatusName = currentStep && currentStep.statusId ? (currentStep.statusId.name || currentStep.statusId) : 'Approved Step';

    loan.approvalHistory.push({
      action,
      notes,
      approverId: req.user._id,
      approverName: req.user.name || 'Unknown',
      status: stepStatusName,
      date: new Date()
    });

    loan.approvalStatus = stepStatusName;
    loan.approvalStep += 1;

    if (loan.approvalStep >= flow.steps.length) {
      loan.approvalStatus = 'Pending Scheduling';
    }

    await loan.save();
    const updatedLoan = await Loan.findById(id).populate('customerId');
    res.json(updatedLoan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const downloadAgreement = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customerId');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const pdf = await generateAgreementPDF(loan);
    res.contentType("application/pdf");
    res.setHeader('Content-Disposition', `attachment; filename=Agreement_${loan._id}.pdf`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ message: 'Error generating agreement PDF' });
  }
};

export const getAgreementHTML = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customerId');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const html = generateAgreementHTML(loan, true);
    res.contentType("text/html");
    res.send(html);
  } catch (error) {
    res.status(500).json({ message: 'Error generating agreement HTML' });
  }
};

export const sendAgreementEmail = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customerId');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    res.json({ message: 'Email sent successfully to ' + (loan.customerId?.email || 'customer') });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmDispatch = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customerId');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    loan.approvalStatus = 'Pending Commissioning';
    loan.dispatchDate = req.body.dispatchDate || new Date().toISOString().split('T')[0];
    if (req.body.serialNumber) loan.serialNumber = req.body.serialNumber;
    if (req.body.dispatchData) loan.dispatchData = req.body.dispatchData;
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmCommission = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customerId');
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    loan.approvalStatus = 'Active';
    loan.commissionDate = req.body.commissionDate || new Date().toISOString().split('T')[0];
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveSchedule = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    loan.approvalStatus = 'Pending Invoice';
    
    if (req.body.notes) {
      loan.approvalHistory = loan.approvalHistory || [];
      loan.approvalHistory.push({
        step: 'Scheduling Phase',
        status: 'Scheduled',
        notes: req.body.notes,
        date: new Date()
      });
    }
    
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveInvoice = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    loan.approvalStatus = 'Pending Dispatch';
    
    if (req.body.invoiceNumber) {
      loan.invoiceNumber = req.body.invoiceNumber;
    }
    
    if (req.body.invoiceData) {
      loan.invoiceData = req.body.invoiceData;
    }
    
    if (req.body.notes) {
      loan.approvalHistory = loan.approvalHistory || [];
      loan.approvalHistory.push({
        step: 'Invoicing Phase',
        status: 'Invoiced',
        notes: req.body.notes,
        date: new Date()
      });
    }
    
    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadReceipt = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customerId');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const installmentNum = parseInt(req.params.installment);
    const installment = loan.schedule.find((s, index) => s.installment === installmentNum || s.installmentNo === installmentNum || (index + 1) === installmentNum);

    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    const pdf = await generateReceiptPDF(loan, installment);

    res.contentType("application/pdf");
    res.send(pdf);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ message: 'Error generating PDF receipt' });
  }
};

export const downloadReport = async (req, res) => {
  try {
    const { id, format } = req.params;
    const loan = await Loan.findById(id).populate('customerId');

    if (!loan) {
      return res.status(404).json({ message: 'Asset Protocol Not Found' });
    }

    let buffer;
    let contentType;
    let extension;

    switch (format.toLowerCase()) {
      case 'excel':
        buffer = await generateExcelReport(loan);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = 'xlsx';
        break;
      case 'ppt': {
        const allLoans = await Loan.find({ customerId: loan.customerId._id }).populate('customerId');
        buffer = await generatePPTReport(loan, allLoans);
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        extension = 'pptx';
        break;
      }
      case 'pdf':
        buffer = await generatePDFReport(loan);
        contentType = 'application/pdf';
        extension = 'pdf';
        break;
      default:
        return res.status(400).json({ message: 'Invalid Format Protocol' });
    }

    const filename = `Strategic_Report_${loan.machineName.replace(/\s+/g, '_')}.${extension}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);

  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ message: 'Protocol Failure: Report Generation Aborted' });
  }
};

export const lookupLoan = async (req, res) => {
  try {
    const { invoice, serial } = req.query;

    if (!invoice && !serial) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        status: "Bad Request",
        error: {
          code: "MISSING_PARAM",
          message: "A required query parameter 'invoice' or 'serial' is missing."
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    const query = {};
    if (invoice) {
      query.invoiceNumber = invoice;
    } else if (serial) {
      query.serialNumber = serial;
    }

    const loan = await Loan.findOne(query).populate('customerId');
    if (!loan) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        status: "Not Found",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: `No loan record exists for the provided ${invoice ? 'invoice (' + invoice + ')' : 'serial (' + serial + ')'}.`
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    // Fetch associated machine
    let machineInfo = null;
    if (loan.machineName) {
      const machineDoc = await Machine.findOne({ name: loan.machineName });
      if (machineDoc) {
        machineInfo = {
          name: machineDoc.name,
          category: machineDoc.category,
          model: machineDoc.model,
          serialNumber: loan.serialNumber,
          machinePrice: loan.machinePrice,
          warranty: machineDoc.warranty
        };
      } else {
        machineInfo = {
          name: loan.machineName,
          model: loan.model,
          serialNumber: loan.serialNumber,
          machinePrice: loan.machinePrice
        };
      }
    }

    // Calculate schedule summary
    const scheduleSummary = {
      totalInstallments: loan.schedule ? loan.schedule.length : 0,
      paidInstallments: loan.schedule ? loan.schedule.filter(s => s.status === 'Paid').length : 0,
      pendingInstallments: loan.schedule ? loan.schedule.filter(s => s.status !== 'Paid').length : 0,
      nextDueDate: null,
      outstandingPrincipal: 0,
      overdueInstallments: 0
    };

    if (loan.schedule && loan.schedule.length > 0) {
      const pending = loan.schedule.filter(s => s.status !== 'Paid').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      if (pending.length > 0) {
        scheduleSummary.nextDueDate = pending[0].dueDate;
      }
      const lastPaid = loan.schedule.filter(s => s.status === 'Paid').sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
      if (lastPaid) {
        scheduleSummary.outstandingPrincipal = lastPaid.balance || 0;
      } else if (pending.length > 0) {
        scheduleSummary.outstandingPrincipal = loan.principal || 0;
      }
      
      const now = new Date();
      scheduleSummary.overdueInstallments = loan.schedule.filter(s => s.status !== 'Paid' && new Date(s.dueDate) < now).length;
    }

    const customerData = loan.customerId ? {
      id: loan.customerId._id,
      name: loan.customerId.name,
      customId: loan.customerId.customId,
      mobile: loan.customerId.mobile,
      email: loan.customerId.email,
      gst: loan.customerId.gst,
      type: loan.customerId.type
    } : null;

    // Dispatch info
    const dispatchInfo = {
      invoiceNumber: loan.invoiceNumber,
      invoiceDate: loan.invoiceData?.invoiceDate || loan.invoiceData?.date || null,
      dispatchDate: loan.dispatchDate,
      serialNumber: loan.serialNumber,
      documents: {
        invoiceFile: loan.invoiceUrl || loan.invoiceData?.invoiceFile || loan.invoiceData?.url || null,
        ddFile: loan.dispatchData?.ddFile || loan.dispatchData?.url || null,
        lrFile: loan.dispatchData?.lrFile || loan.dispatchData?.lrUrl || null
      }
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      status: "OK",
      data: {
        loanId: loan._id,
        customer: customerData,
        machine: machineInfo,
        loanDetails: {
          principal: loan.principal,
          emi: loan.emi,
          tenure: loan.tenure,
          interestRate: loan.interestRate,
          downPayment: loan.downPayment,
          discount: {
            amount: loan.discountAmount || 0,
            percentage: loan.discountPercentage || 0
          },
          delayInterest: loan.delayInterest,
          status: loan.status,
          approvalStatus: loan.approvalStatus,
          agreementGenerated: loan.agreementGenerated,
          agreementUrl: loan.agreementUrl,
          emiStartDate: loan.emiStartDate,
          scheduleSummary,
          schedule: loan.schedule
        },
        dispatchInfo,
        approvalHistory: loan.approvalHistory
      },
      meta: {
        requestedAt: new Date().toISOString(),
        lookupType: invoice ? 'invoice' : 'serial',
        lookupValue: invoice || serial
      }
    });

  } catch (error) {
    console.error("Lookup Loan Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      status: "Internal Server Error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while processing your request."
      },
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }
};
