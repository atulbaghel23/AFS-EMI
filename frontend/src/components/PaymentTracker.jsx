import React, { useRef, useState } from 'react';
import { state } from '../state';
import { formatINR, showNotification } from '../utils';
import { Download, Upload, Loader2, ChevronRight, Check } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const PaymentTracker = () => {
  const { payments, loans, user } = state.data;
  const uCustId = (user?.customerId?._id || user?.customerId)?.toString();


  // const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  const isAdmin = user?.role === 'OEM' || user?.role === 'Admin';
  const isCustomer = user?.role === 'CUSTOMER' || (!isAdmin && user?.role !== 'SUPERVISOR');

  // 1. Process Settled Payments
  const settledEntries = (isCustomer
    ? payments.filter(p => {
      const pCustId = (p.loanId?.customerId?._id || p.loanId?.customerId)?.toString();
      return pCustId && uCustId && pCustId === uCustId;
    })
    : payments
  ).map(p => ({
    ...p,
    entryType: 'SETTLED',
    displayAmount: p.amount,
    displayDate: p.date,
    uploadDate: p.createdAt,
    invoiceNumber: p.loanId?.invoiceNumber || p.loanId?.invoiceData?.invoiceNumber,
    assetName: p.loanId?.machineName,
    customerName: p.loanId?.customerId?.name,
    processedBy: p.uploadedBy?.email || 'System',
    allocations: p.allocations,
    transactionId: p.transactionId
  }));

  // 2. Process Pending EMIs from Loans
  const clientLoans = isCustomer
    ? loans.filter(l => {
      const lCustId = (l.customerId?._id || l.customerId)?.toString();
      return lCustId && uCustId && lCustId === uCustId;
    })
    : loans;

  const pendingEntries = clientLoans.flatMap(l =>
    (l.schedule || [])
      .filter(s => s.status === 'Pending' || s.status === 'Partial')
      .map(s => ({
        _id: `pending-${l._id}-${s.dueDate}`,
        entryType: s.status === 'Partial' ? 'PARTIAL' : 'PENDING',
        displayAmount: s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi,
        displayDate: s.dueDate, // The expected date
        uploadDate: null,       // Has not been processed yet
        invoiceNumber: l.invoiceNumber || l.invoiceData?.invoiceNumber,
        assetName: l.machineName,
        customerName: l.customerId?.name || 'Customer',
        isOverdue: new Date(s.dueDate) < new Date()
      }))
  );
  // 3. Combine and Sort
  const allEntries = [...settledEntries].sort((a, b) => {
    const dateA = a.uploadDate ? new Date(a.uploadDate) : new Date(a.displayDate);
    const dateB = b.uploadDate ? new Date(b.uploadDate) : new Date(b.displayDate);
    return dateB - dateA;
  });

  const totalCollected = settledEntries.reduce((acc, p) => acc + p.displayAmount, 0);
  const totalPending = pendingEntries.reduce((acc, p) => acc + p.displayAmount, 0);

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Settlement Ledger');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Asset', key: 'asset', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    allEntries.forEach(e => {
      worksheet.addRow({
        date: e.displayDate,
        customer: e.customerName || 'Unknown',
        asset: e.assetName || 'Asset',
        amount: e.displayAmount,
        status: e.entryType === 'SETTLED' ? 'Settled' : (e.isOverdue ? 'Overdue' : 'Pending')
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Settlement_Ledger_${new Date().getTime()}.xlsx`);
  };




  const handleExportFormat = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('EMI Settlement Format');

    worksheet.columns = [
      { header: 'Invoice Number', key: 'invoiceNo', width: 25 },
      { header: 'Payment Date', key: 'date', width: 15 },
      { header: 'Paid Amount', key: 'amount', width: 15 },
      { header: 'Transaction ID', key: 'utrNo', width: 25 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    // Export a completely blank template for bulk upload
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `EMI_Settlement_Format_${new Date().getTime()}.xlsx`);
  };


  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkValidation, setBulkValidation] = useState(null);
  const [bulkLogId, setBulkLogId] = useState(null);
  const [bulkStatus, setBulkStatus] = useState('idle'); // idle, validating, validated, importing, imported, error

  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkStatus('validating');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('https://afs-emi.vercel.app/api/payments/bulk-upload/validate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Validation failed');

      setBulkValidation(data);
      setBulkStatus('validated');
    } catch (err) {
      console.error(err);
      showNotification('Failed to validate Excel file', 'error');
      setBulkStatus('error');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setBulkStatus('importing');

    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      const res = await fetch('https://afs-emi.vercel.app/api/payments/bulk-upload/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import failed');

      setBulkLogId(data.logId);
      setBulkStatus('imported');
      showNotification(data.message, 'success');
      setTimeout(() => state.fetchData(), 1000);
    } catch (err) {
      console.error(err);
      showNotification('Failed to import Excel file', 'error');
      setBulkStatus('error');
    }
  };

  const handleDownloadError = () => {
    if (!bulkLogId) return;
    window.location.href = `https://afs-emi.vercel.app/api/payments/bulk-upload/errors/${bulkLogId}?token=${user?.token}`;
  };

  const resetBulkModal = () => {
    setShowBulkModal(false);
    setBulkFile(null);
    setBulkValidation(null);
    setBulkLogId(null);
    setBulkStatus('idle');
  };


  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight uppercase italic">
            Settlement Ledger
          </h2>

          <p className="text-[0.625rem] font-bold text-text-dim uppercase tracking-[0.2em] mt-1">
            Transaction History & Reconciliation Node
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-[#f0883e] hover:bg-[#ff9c5a] text-black rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center"
          >
            <Upload size={16} className="mr-2" />
            BULK EMI UPLOAD
          </button>

          <button
            onClick={handleExport}
            className="btn-primary flex items-center"
          >
            <Download size={16} className="mr-2" />
            EXPORT PROTOCOL
          </button>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Total Collections */}
        <div className="bg-bg-card border border-border-main rounded-2xl p-5 shadow-sm flex flex-col justify-between">

          <p className="text-[0.5rem] font-black text-text-dim uppercase tracking-widest">
            Total Collections
          </p>

          <p className="text-xl font-black text-green-500">
            {formatINR(totalCollected)}
          </p>

        </div>

        {/* Total Exposure */}
        <div className="bg-bg-card border border-border-main rounded-2xl p-5 shadow-sm flex flex-col justify-between">

          <p className="text-[0.5rem] font-black text-text-dim uppercase tracking-widest">
            Total Exposure
          </p>

          <p className="text-xl font-black text-red-500">
            {formatINR(totalPending)}
          </p>

        </div>

        {/* Reconciliation Units */}
        <div className="bg-bg-card border border-border-main rounded-2xl p-5 shadow-sm flex flex-col justify-between">

          <p className="text-[0.5rem] font-black text-text-dim uppercase tracking-widest">
            Reconciliation Units
          </p>

          <p className="text-xl font-black text-primary">
            {allEntries.length}
          </p>

        </div>

      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border-main rounded-2xl overflow-hidden shadow-xl">

        <div className="overflow-x-auto">

          <table className="w-full text-left compact-table">

            <thead>
              <tr className="bg-bg-deep border-b border-border-main">

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Excel Date
                </th>

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  System Date
                </th>

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Invoice No.
                </th>

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Processed By
                </th>

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Customer
                </th>

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Asset
                </th>

                <th className="px-6 py-4 text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Amount
                </th>

                <th className="px-6 py-4 text-right text-[9px] font-black text-text-dim uppercase tracking-widest">
                  Status
                </th>

              </tr>
            </thead>

            <tbody>

              {allEntries.length > 0 ? (
                allEntries.map((e) => {

                  const isSettled = e?.entryType === 'SETTLED';
                  const isOverdue = e?.isOverdue;

                  return (
                    <tr
                      key={e?._id}
                      onClick={() => isSettled && setSelectedPayment(e)}
                      className={`transition-colors ${e?.entryType === 'PENDING' ? 'opacity-80 hover:bg-bg-active' : 'hover:bg-bg-active cursor-pointer'}`}
                    >

                      {/* Excel Date */}
                      <td
                        className={`px-6 py-4 text-[0.625rem] font-black font-mono uppercase ${isOverdue ? 'text-red-500' : 'text-text-dim'
                          }`}
                      >
                        {e?.displayDate ? new Date(e.displayDate).toLocaleDateString('en-GB') : '-'}
                      </td>

                      {/* System Date (Upload Date) */}
                      <td className="px-6 py-4 text-[0.625rem] font-black font-mono text-text-dim uppercase">
                        {e?.uploadDate ? new Date(e.uploadDate).toLocaleString('en-GB') : '-'}
                      </td>

                      {/* Invoice No */}
                      <td className="px-6 py-4">
                        <span className="text-[0.6rem] font-black text-primary uppercase tracking-widest font-mono bg-primary/5 px-2 py-1 rounded border border-primary/10">
                          {e?.invoiceNumber || '-'}
                        </span>
                      </td>

                      {/* Processed By */}
                      <td className="px-6 py-4">
                        <span className="text-[0.6rem] font-bold text-text-dim truncate max-w-[120px] block">
                          {e?.processedBy}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="font-black text-text-main text-[0.6875rem]">
                          {e?.customerName || 'Unknown'}
                        </div>
                        <div className="text-[0.5rem] font-bold text-text-dim uppercase tracking-tighter">
                          REF: {e?._id?.toString()?.slice(-4)?.toUpperCase()}
                        </div>
                      </td>

                      {/* Asset */}
                      <td className="px-6 py-4">

                        <span className="px-2.5 py-1 bg-bg-deep border border-border-main rounded-md text-[8px] font-black text-text-dim uppercase tracking-widest">
                          {e?.assetName || 'Asset'}
                        </span>

                      </td>

                      {/* Amount */}
                      <td
                        className={`px-6 py-4 text-[0.6875rem] font-black ${isSettled ? 'text-green-600' : 'text-primary'
                          }`}
                      >
                        {formatINR(e?.displayAmount || 0)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-right">

                        {isSettled ? (
                          <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-[8px] font-black text-green-500 uppercase tracking-widest">
                            Settled
                          </span>
                        ) : e?.entryType === 'PARTIAL' ? (
                          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-[8px] font-black text-amber-500 uppercase tracking-widest">
                            {isOverdue ? 'Partial (Overdue)' : 'Partial'}
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 border rounded-md text-[8px] font-black uppercase tracking-widest ${isOverdue
                              ? 'bg-red-500/10 border-red-500/20 text-red-500'
                              : 'bg-primary/10 border-primary/20 text-primary'
                              }`}
                          >
                            {isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        )}

                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-10 text-text-dim text-sm font-bold"
                  >
                    No settlement entries found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-main rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-slide-up flex flex-col">
            <div className="px-6 py-4 border-b border-border-main bg-bg-deep flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Upload size={16} className="text-primary" /> BULK EMI UPLOAD PROTOCOL
                </h3>
                <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1">Excel Processing Engine</p>
              </div>
              <button onClick={resetBulkModal} className="text-text-dim hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {bulkStatus === 'idle' && (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-2">Step 1: Format Compliance</h4>
                    <p className="text-[10px] text-text-dim mb-4">Ensure your Excel file precisely matches the system template structure. Missing fields will trigger validation blocks.</p>
                    <button onClick={handleExportFormat} className="text-[10px] font-bold text-white bg-[#1c2128] hover:bg-[#30363d] px-4 py-2 rounded border border-[#30363d] transition-all">
                      ↓ Download Sample Template
                    </button>
                  </div>

                  <div className="p-4 bg-bg-deep border border-border-main rounded-xl">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-2">Step 2: Upload Data Node</h4>
                    <input
                      type="file"
                      onChange={handleBulkFileChange}
                      accept=".xlsx, .xls"
                      className="block w-full text-[10px] text-text-dim file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-black hover:file:bg-primary/90 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {bulkStatus === 'validating' && (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-primary animate-spin mb-4" />
                  <p className="text-[10px] font-black text-text-dim uppercase tracking-widest animate-pulse">Running Validation Protocols...</p>
                </div>
              )}

              {bulkStatus === 'validated' && bulkValidation && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-bg-deep border border-border-main rounded-xl text-center">
                      <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-1">Total Rows</p>
                      <p className="text-2xl font-black text-white">{bulkValidation.total}</p>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                      <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-1">Valid Rows</p>
                      <p className="text-2xl font-black text-green-500">{bulkValidation.validRows.length}</p>
                    </div>
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">Invalid Rows</p>
                      <p className="text-2xl font-black text-rose-500">{bulkValidation.errorRows.length}</p>
                    </div>
                  </div>

                  {bulkValidation.errorRows.length > 0 && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                      <p className="text-[10px] font-bold text-rose-500 mb-3">Warning: {bulkValidation.errorRows.length} rows failed validation and will be skipped during import.</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                        {bulkValidation.errorRows.map((err, idx) => (
                          <div key={idx} className="text-[9px] font-mono text-rose-500/80 bg-rose-500/10 p-2 rounded flex gap-2">
                            <span className="font-bold shrink-0">Row {err.rowNumber}:</span>
                            <span>{err.errorMessage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bulkValidation.validRows.length > 0 ? (
                    <div className="flex justify-end">
                      <button onClick={handleBulkImport} className="px-6 py-2 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-all shadow-lg flex items-center gap-2">
                        Execute Import <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">No valid rows to import.</p>
                    </div>
                  )}
                </div>
              )}

              {bulkStatus === 'importing' && (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-green-500 animate-spin mb-4" />
                  <p className="text-[10px] font-black text-text-dim uppercase tracking-widest animate-pulse">Executing Mainframe Import...</p>
                </div>
              )}

              {bulkStatus === 'imported' && (
                <div className="py-8 space-y-6 text-center">
                  <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase">Upload Completed</h3>

                  {bulkValidation?.errorRows?.length > 0 && (
                    <div className="max-w-md mx-auto p-4 bg-bg-deep border border-border-main rounded-xl text-left">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3">Download Audit Log for the Failed Rows</p>
                      <button onClick={handleDownloadError} className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2">
                        <Download size={14} /> Download Error Report
                      </button>
                    </div>
                  )}

                  <button onClick={resetBulkModal} className="px-6 py-2 bg-bg-active text-white border border-border-main text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#30363d] transition-all mt-4">
                    Close Terminal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-main rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border-main bg-bg-deep">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Payment Ledger Details</h2>
                <p className="text-[10px] text-text-dim mt-1 font-mono uppercase">TRANSACTION ID: {selectedPayment.transactionId || 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 hover:bg-bg-active rounded-lg transition-colors text-text-dim hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-bg-deep p-4 rounded-xl border border-border-main">
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1">Invoice Number</p>
                  <p className="text-sm font-black text-primary">{selectedPayment.invoiceNumber}</p>
                </div>
                <div className="bg-bg-deep p-4 rounded-xl border border-border-main">
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1">Processed By</p>
                  <p className="text-sm font-black text-white">{selectedPayment.processedBy}</p>
                </div>
                <div className="bg-bg-deep p-4 rounded-xl border border-border-main">
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1">Excel File Date</p>
                  <p className="text-sm font-black text-white">{selectedPayment.displayDate}</p>
                </div>
                <div className="bg-bg-deep p-4 rounded-xl border border-border-main">
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1">System Processing Date</p>
                  <p className="text-sm font-black text-white">{new Date(selectedPayment.uploadDate).toLocaleString()}</p>
                </div>
              </div>

              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Total Payment Breakdown
              </h3>

              <div className="bg-bg-deep rounded-xl border border-border-main overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-bg-active border-b border-border-main">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-text-dim uppercase tracking-widest">EMI / Installment No.</th>
                      <th className="px-4 py-3 text-[9px] font-black text-text-dim uppercase tracking-widest">Type</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black text-text-dim uppercase tracking-widest">Amount Cleared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPayment.allocations && selectedPayment.allocations.length > 0 ? (
                      selectedPayment.allocations.map((alloc, idx) => (
                        <tr key={idx} className="border-b border-border-main last:border-0 hover:bg-bg-active/50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-white">EMI {alloc.installmentNo}</td>
                          <td className="px-4 py-3 text-xs font-bold">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${alloc.type === 'Principal' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                              {alloc.type === 'Principal' ? 'Principal' : 'Overdue Penalty'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-black text-green-500">{formatINR(alloc.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-6 text-center text-[10px] font-black text-text-dim uppercase tracking-widest">No allocation details found for this legacy payment.</td>
                      </tr>
                    )}
                  </tbody>
                  {selectedPayment.allocations && selectedPayment.allocations.length > 0 && (
                    <tfoot className="bg-bg-active/50 border-t border-border-main">
                      <tr>
                        <td colSpan="2" className="px-4 py-3 text-right text-[10px] font-black text-text-dim uppercase tracking-widest">Total Amount</td>
                        <td className="px-4 py-3 text-right text-sm font-black text-white">{formatINR(selectedPayment.displayAmount)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-border-main bg-bg-deep text-right">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-6 py-2 bg-bg-active hover:bg-[#30363d] border border-border-main text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTracker;