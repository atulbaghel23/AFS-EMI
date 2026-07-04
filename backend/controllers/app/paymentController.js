import Payment from '../../models/Payment.js';
import Loan from '../../models/Loan.js';
import ExcelJS from 'exceljs';
import BulkUploadLog from '../../models/BulkUploadLog.js';

export const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate({
        path: 'loanId',
        populate: { path: 'customerId' }
      })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPayment = async (req, res) => {
  const payment = new Payment({
    ...req.body,
    uploadedBy: req.user ? req.user._id : null
  });
  try {
    const loan = await Loan.findById(req.body.loanId);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    let remainingPayment = req.body.amount || 0;
    const waiveInterest = req.body.waiveInterest || false;
    const waiverReason = req.body.waiverReason || '';
    const delayRate = loan.delayInterest || 0;
    const currentDate = new Date(req.body.date || new Date());
    const allocations = [];

    // Sort schedule by installment number
    loan.schedule.sort((a, b) => a.installment - b.installment);

    for (let i = 0; i < loan.schedule.length; i++) {
      let s = loan.schedule[i];
      if (s.status === 'Paid') continue;

      if (s.outstandingAmount === undefined || s.outstandingAmount === null) {
        s.outstandingAmount = s.emi;
      }

      // 1. Calculate Overdue Interest for this installment
      const dueDate = new Date(s.dueDate);
      let newOverdue = 0;

      if (currentDate > dueDate && delayRate > 0) {
        const diffTime = Math.abs(currentDate - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const ratePerDay = (delayRate / 100) / 365;

        let baseAmount = s.outstandingAmount;
        if (loan.compoundOverdueInterest) {
          baseAmount += s.overdueInterest;
        }
        newOverdue = Math.round(baseAmount * ratePerDay * diffDays);
      }

      // If overdue interest was previously calculated, we update it.
      // But we shouldn't keep adding if it hasn't been paid. 
      // For simplicity, we just set it to the calculated value if it's higher.
      if (newOverdue > s.overdueInterest) {
        s.overdueInterest = newOverdue;
      }

      // 2. Waive Interest if requested
      if (waiveInterest && s.overdueInterest > 0) {
        loan.interestWaiverLogs.push({
          user: req.user ? req.user.name : 'System',
          date: new Date(),
          amountWaived: s.overdueInterest,
          reason: waiverReason,
          installmentNo: s.installment
        });
        s.overdueInterest = 0;
      }

      if (remainingPayment <= 0) break;

      const startingRemaining = remainingPayment;

      if (s.overdueInterest > 0) {
        const payInterest = Math.min(remainingPayment, s.overdueInterest);
        s.overdueInterest -= payInterest;
        s.paidOverdueInterest = (s.paidOverdueInterest || 0) + payInterest;
        remainingPayment -= payInterest;
        allocations.push({ installmentNo: s.installment || (i + 1), type: 'OverdueInterest', amount: payInterest });
      }

      // Priority 2 & 4: Principal / Outstanding Amount
      if (s.outstandingAmount > 0 && remainingPayment > 0) {
        const payPrincipal = Math.min(remainingPayment, s.outstandingAmount);
        s.outstandingAmount -= payPrincipal;
        s.paidAmount = (s.paidAmount || 0) + payPrincipal;
        remainingPayment -= payPrincipal;
        allocations.push({ installmentNo: s.installment || (i + 1), type: 'Principal', amount: payPrincipal });
      }

      const paymentMadeToThis = startingRemaining > remainingPayment;

      // Check if fully paid or if partial payment should trigger carry-forward
      if (s.outstandingAmount <= 0 && s.overdueInterest <= 0) {
        s.status = 'Paid';
        s.outstandingAmount = 0;
        s.paidDate = currentDate;
      } else if (paymentMadeToThis) {
        if (i + 1 < loan.schedule.length) {
          s.status = 'Paid';
          s.paidDate = currentDate;

          let nextS = loan.schedule[i + 1];
          if (nextS.outstandingAmount === undefined || nextS.outstandingAmount === null) {
            nextS.outstandingAmount = nextS.emi;
          }
          nextS.outstandingAmount += s.outstandingAmount;
          nextS.overdueInterest = (nextS.overdueInterest || 0) + s.overdueInterest;

          s.outstandingAmount = 0;
          s.overdueInterest = 0;
        } else {
          s.status = 'Partial';
          s.paidDate = currentDate;
        }
      }

      if (remainingPayment <= 0) break;
    }

    // Advance Payment (Scenario 3)
    // If there is still remaining payment and all current/overdue installments are paid,
    // it will just naturally apply to the next pending installment in the loop above!
    // Because the loop goes through all installments.

    payment.allocations = allocations;
    const newPayment = await payment.save();

    await loan.save();

    res.status(201).json(newPayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const processExcelRows = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  const results = { total: 0, validRows: [], errorRows: [] };
  if (!worksheet) return results;

  const todayStr = new Date().toISOString().split('T')[0];
  const processedInvoicesToday = new Set();

  const allLoans = await Loan.find({}).lean();
  const todaysPayments = await Payment.find({ date: { $regex: `^${todayStr}` } }).lean();

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    if (!row.values || row.values.length === 0) continue;

    // Skip completely empty rows
    const hasData = row.values.some(v => v !== null && v !== undefined && v !== '');
    if (!hasData) continue;

    results.total++;

    const invoiceNumber = row.getCell(1).value?.toString()?.trim();
    const paymentDateVal = row.getCell(2).value;
    const paidAmount = parseFloat(row.getCell(3).value) || 0;
    const transactionId = row.getCell(4).value?.toString()?.trim();
    const remarks = row.getCell(5).value?.toString()?.trim() || '';

    let errorMessage = null;

    let formattedDate = null;
    let rawDateVal = paymentDateVal;
    if (paymentDateVal && typeof paymentDateVal === 'object' && 'result' in paymentDateVal) {
      rawDateVal = paymentDateVal.result;
    }

    if (rawDateVal instanceof Date) {
      formattedDate = rawDateVal;
    } else if (rawDateVal !== null && rawDateVal !== undefined && rawDateVal !== '') {
      const dateStr = rawDateVal.toString().trim();
      const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) formattedDate = parsed;
      } else {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) formattedDate = parsed;
      }
    }
    const uploadedDateStr = formattedDate ? formattedDate.toISOString().split('T')[0] : '';

    const matchingLoans = allLoans.filter(l =>
      l.invoiceNumber === invoiceNumber ||
      l.invoiceData?.invoiceNumber === invoiceNumber ||
      l._id.toString() === invoiceNumber
    );

    let matchedLoan = null;
    if (matchingLoans.length > 0) {
      matchedLoan = matchingLoans.find(l => (l.schedule || []).some(s => s.status !== 'Paid')) || matchingLoans[0];
    }

    let firstPendingEmi = null;

    if (!matchedLoan) {
      errorMessage = 'Invoice not found.';
    } else {
      matchedLoan.schedule.sort((a, b) => a.installment - b.installment);
      firstPendingEmi = (matchedLoan.schedule || []).find(s => s.status !== 'Paid');
      if (!firstPendingEmi) {
        errorMessage = `Loan is already fully paid. No pending installments found.`;
      }
    }

    if (!errorMessage) {
      if (!paymentDateVal) errorMessage = 'Payment Date is mandatory.';
      else if (!formattedDate) errorMessage = 'Invalid Payment Date format (use DD/MM/YYYY or YYYY-MM-DD).';
      else if (paidAmount <= 0) errorMessage = 'Paid Amount must be greater than zero.';
      else if (!transactionId) errorMessage = 'Transaction ID is mandatory.';
    }

    if (!errorMessage) {
      // Prevent duplicate transactions based on transaction ID
      const alreadyPaidToday = todaysPayments.some(p =>
        p.transactionId === transactionId ||
        (p.loanId.toString() === matchedLoan._id.toString() && p.amount === paidAmount && p.date.startsWith(uploadedDateStr))
      );
      if (alreadyPaidToday) {
        errorMessage = `A payment of ${paidAmount} for this invoice was already processed on ${uploadedDateStr}.`;
      }
    }

    const rowData = {
      rowNumber: i,
      invoiceNumber,
      paymentDate: uploadedDateStr,
      paidAmount,
      transactionId,
      remarks,
      loanId: matchedLoan ? matchedLoan._id : null
    };

    if (errorMessage) {
      results.errorRows.push({ ...rowData, errorMessage });
    } else {
      results.validRows.push(rowData);
    }
  }

  return results;
};

export const validateBulkUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const results = await processExcelRows(req.file.buffer);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const importBulkUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const results = await processExcelRows(req.file.buffer);

    let successfulRecords = 0;

    for (const validRow of results.validRows) {
      const loan = await Loan.findById(validRow.loanId);
      if (!loan) continue;

      let remainingPayment = validRow.paidAmount;
      const currentDate = new Date(validRow.paymentDate);
      const delayRate = loan.delayInterest || 0;
      const allocations = [];

      loan.schedule.sort((a, b) => a.installment - b.installment);

      for (let i = 0; i < loan.schedule.length; i++) {
        let s = loan.schedule[i];
        if (s.status === 'Paid') continue;

        if (s.outstandingAmount === undefined || s.outstandingAmount === null) {
          s.outstandingAmount = s.emi;
        }

        const dueDate = new Date(s.dueDate);
        let newOverdue = 0;

        if (currentDate > dueDate && delayRate > 0) {
          const diffTime = Math.abs(currentDate - dueDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const ratePerDay = (delayRate / 100) / 365;

          let baseAmount = s.outstandingAmount;
          if (loan.compoundOverdueInterest) {
            baseAmount += (s.overdueInterest || 0);
          }
          newOverdue = Math.round(baseAmount * ratePerDay * diffDays);
        }

        if (newOverdue > (s.overdueInterest || 0)) {
          s.overdueInterest = newOverdue;
        }

        if (remainingPayment <= 0) break;

        const startingRemaining = remainingPayment;

        if (s.overdueInterest > 0) {
          const payInterest = Math.min(remainingPayment, s.overdueInterest);
          s.overdueInterest -= payInterest;
          s.paidOverdueInterest = (s.paidOverdueInterest || 0) + payInterest;
          remainingPayment -= payInterest;
          allocations.push({ installmentNo: s.installment || (i + 1), type: 'OverdueInterest', amount: payInterest });
        }

        if (s.outstandingAmount > 0 && remainingPayment > 0) {
          const payPrincipal = Math.min(remainingPayment, s.outstandingAmount);
          s.outstandingAmount -= payPrincipal;
          s.paidAmount = (s.paidAmount || 0) + payPrincipal;
          remainingPayment -= payPrincipal;
          allocations.push({ installmentNo: s.installment || (i + 1), type: 'Principal', amount: payPrincipal });
        }

        const paymentMadeToThis = startingRemaining > remainingPayment;

        if (s.outstandingAmount <= 0 && s.overdueInterest <= 0) {
          s.status = 'Paid';
          s.outstandingAmount = 0;
          s.paidDate = validRow.paymentDate;
        } else if (paymentMadeToThis) {
          if (i + 1 < loan.schedule.length) {
            s.status = 'Paid';
            s.paidDate = validRow.paymentDate;

            let nextS = loan.schedule[i + 1];
            if (nextS.outstandingAmount === undefined || nextS.outstandingAmount === null) {
              nextS.outstandingAmount = nextS.emi;
            }
            nextS.outstandingAmount += s.outstandingAmount;
            nextS.overdueInterest = (nextS.overdueInterest || 0) + s.overdueInterest;

            s.outstandingAmount = 0;
            s.overdueInterest = 0;
          } else {
            s.status = 'Partial';
            s.paidDate = validRow.paymentDate;
          }
        }

        if (remainingPayment <= 0) break;
      }

      const payment = new Payment({
        loanId: loan._id,
        amount: validRow.paidAmount,
        date: validRow.paymentDate,
        transactionId: validRow.transactionId,
        method: 'Bulk Upload',
        allocations,
        uploadedBy: req.user ? req.user._id : null
      });

      await payment.save();
      await loan.save();
      successfulRecords++;
    }

    const logEntry = new BulkUploadLog({
      fileName: req.file.originalname,
      uploadedBy: req.user._id,
      totalRecords: results.total,
      successfulRecords: successfulRecords,
      failedRecords: results.errorRows.length,
      uploadErrors: results.errorRows.map(e => ({
        rowNumber: e.rowNumber,
        invoiceNumber: e.invoiceNumber,
        emiNumber: e.emiNumber,
        errorMessage: e.errorMessage
      }))
    });

    await logEntry.save();

    res.status(201).json({
      message: 'Bulk EMI Upload Completed Successfully',
      logId: logEntry._id,
      totalRecords: results.total,
      successfulRecords: successfulRecords,
      failedRecords: results.errorRows.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBulkUploadErrorReport = async (req, res) => {
  try {
    const logId = req.params.logId;
    const logEntry = await BulkUploadLog.findById(logId);

    if (!logEntry) return res.status(404).json({ message: 'Log not found' });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Error Report');

    worksheet.columns = [
      { header: 'Row Number', key: 'rowNumber', width: 15 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 25 },
      { header: 'EMI Number', key: 'emiNumber', width: 15 },
      { header: 'Error Message', key: 'errorMessage', width: 40 }
    ];

    logEntry.uploadErrors.forEach(e => {
      worksheet.addRow({
        rowNumber: e.rowNumber,
        invoiceNumber: e.invoiceNumber || 'N/A',
        emiNumber: e.emiNumber || 'N/A',
        errorMessage: e.errorMessage
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Error_Report_${logEntry.fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
