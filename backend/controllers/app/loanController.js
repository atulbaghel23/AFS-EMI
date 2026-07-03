import Loan from '../../models/Loan.js';
import ApprovalFlow from '../../models/ApprovalFlow.js';
import { generateReceiptPDF } from '../../services/pdfService.js';
import { generateAgreementPDF } from '../../services/pdfService.js';
import { generateExcelReport, generatePPTReport, generatePDFReport } from '../../services/reportService.js';

import Machine from '../../models/Machine.js';
export const getLoans = async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role === 'CUSTOMER' && req.user.customerId) {
      filter.customerId = req.user.customerId;
    }

    const loans = await Loan.find(filter).sort({ createdAt: -1 });

    // Fetch machines to map their details (images, specs, etc.) to the respective loans
    const machines = await Machine.find().lean();

    // Map to simplified objects containing only machine details
    const data = loans.map(loan => {
      // Find the matched machine in the catalog
      const matchedMachine = machines.find(m => m.name === loan.machineName && m.model === loan.model)
        || machines.find(m => m.name === loan.machineName)
        || machines.find(m => loan.machineName && m.name && loan.machineName.toLowerCase().includes(m.name.toLowerCase()));

      return {
        _id: loan._id,
        machineName: loan.machineName,
        model: loan.model,
        serialNumber: loan.serialNumber,
        invoiceData: loan.invoiceData,
        status: loan.status,
        approvalStatus: loan.approvalStatus,
        machineDetails: matchedMachine ? {
          _id: matchedMachine._id,
          name: matchedMachine.name,
          model: matchedMachine.model,
          category: matchedMachine.category,
          brand: matchedMachine.brand,
          images: matchedMachine.images,
          img: matchedMachine.img,
          specs: matchedMachine.specs,
          pricing: matchedMachine.pricing
        } : null
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Data retrieved successfully",
      data,
    });
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
      loan.approvalStatus = 'Approved';
      loan.agreementGenerated = true;
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
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Data retrieved successfully",
        data: {
          machines: updated, // change key according to your API
        }
      });
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
