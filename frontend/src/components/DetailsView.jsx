import React, { useState, useRef, useEffect } from 'react';
import { state } from '../state';
import { formatINR, showNotification } from '../utils';
import Swal from 'sweetalert2';
import {
  X, Download, Cpu, Zap, Settings, FileText, Maximize2, ChevronRight,
  Info, Calendar, Weight, History, Box, Truck, DollarSign, ShieldCheck, ExternalLink,
  CreditCard, TrendingUp, AlertCircle, CheckCircle2, Clock, PieChart
} from 'lucide-react';

const LoanDetails = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const { loans, machines, selectedLoanId, payments = [] } = state.data;

  if (!selectedLoanId) return null;

  const loan = loans.find(l => l._id === selectedLoanId);
  if (!loan || !loan.schedule || loan.schedule.length === 0) return null;

  const machine = machines.find(m => m.name === loan.machineName) || { img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1200', name: 'Asset', model: 'N/A' };
  const totalPaidCount = loan.schedule.filter(s => s.status === 'Paid' || s.status === 'Clear').length;

  const actualTotalValue = loan.schedule.reduce((sum, s) => sum + (s.emi || 0), 0);

  const actualTotalPaidAmt = loan.schedule.reduce((sum, s) => {
    const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0
      ? s.paidAmount
      : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
    return sum + principalPaid + (s.paidOverdueInterest || 0);
  }, 0);

  const progress = (actualTotalPaidAmt / (actualTotalValue || 1)) * 100;

  let carryForwardOutstanding = 0;
  let carryForwardOverdueInt = 0;

  const loanScheduleWithDynamics = loan.schedule.map((s, i) => {
    let currentOutstanding = (s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi) + carryForwardOutstanding;
    let dynamicDelayInt = (s.overdueInterest || 0) + carryForwardOverdueInt;

    carryForwardOutstanding = 0;
    carryForwardOverdueInt = 0;

    let status = s.status;
    let paidAmount = s.paidAmount || 0;
    let displayOverdue = 0;

    // "previus emi is mark to paid no matter how mach money paid you can fix to over due amount is add next emi"
    if (status === 'Partial' && i < loan.schedule.length - 1) {
      displayOverdue = currentOutstanding;

      carryForwardOutstanding = currentOutstanding;
      carryForwardOverdueInt = dynamicDelayInt;

      status = 'Paid';
      paidAmount = s.paidAmount || (s.emi - (s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi));
      currentOutstanding = 0;
      dynamicDelayInt = 0;
    }

    let overdueAmt = displayOverdue;
    if (status !== 'Paid') {
      if (new Date(s.dueDate) < new Date()) {
        overdueAmt = currentOutstanding;
      } else {
        // Do not show carried-forward amount as overdue if this EMI isn't past due yet
        overdueAmt = 0;
      }
    }

    if (overdueAmt > 0 && status !== 'Paid') {
      let diffDays = 0;
      if (new Date(s.dueDate) < new Date()) {
        diffDays = Math.ceil(Math.max(0, new Date() - new Date(s.dueDate)) / (1000 * 60 * 60 * 24));
      } else {
        const prevDate = new Date(s.dueDate);
        prevDate.setMonth(prevDate.getMonth() - 1);
        diffDays = Math.ceil(Math.max(0, new Date() - prevDate) / (1000 * 60 * 60 * 24));
      }
      const calc = Math.round(overdueAmt * ((loan.delayInterest || 24) / 100) / 365 * diffDays);
      if (calc > dynamicDelayInt) dynamicDelayInt = calc;
    }

    return {
      ...s,
      status,
      paidAmount,
      outstandingAmount: currentOutstanding,
      _overdueAmt: overdueAmt,
      _dynamicDelayInt: dynamicDelayInt
    };
  });

  const nextInstallment = loanScheduleWithDynamics.find(s => s.status === 'Pending' || s.status === 'Partial');
  const currentInstallment = nextInstallment || loanScheduleWithDynamics[loanScheduleWithDynamics.length - 1];

  const totalOutstandingBalance = loanScheduleWithDynamics
    .filter(s => s.status === 'Pending' || s.status === 'Partial')
    .reduce((sum, s) => sum + (s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi), 0);

  const totalOverdueInterest = loanScheduleWithDynamics
    .reduce((sum, s) => sum + (s._dynamicDelayInt || 0) + (s.paidOverdueInterest || 0), 0);

  const handleSettleEMI = async () => {
    const pendingInstallments = loan.schedule.filter(s => s.status === 'Pending' || s.status === 'Partial');
    const maxToSettle = pendingInstallments.length;
    const initialSliderValue = pendingInstallments[0]?.status === 'Partial' && maxToSettle > 1 ? 2 : 1;

    const result = await Swal.fire({
      title: 'EMI PAYMENT',
      html: `
        <div class="flex flex-col items-center gap-4 py-4 text-left">
          <p class="text-[0.625rem] font-black text-text-dim uppercase tracking-[0.2em] w-full mb-1">Select Installments</p>
          <input type="range" id="emi-range" class="swal2-range w-full !m-0" min="1" max="${maxToSettle}" value="${initialSliderValue}" style="accent-color: #f0883e;">
          <div class="flex justify-between w-full text-[0.5rem] font-black text-text-dim uppercase tracking-widest mt-1">
            <span>Min: 1</span>
            <span>Max: ${maxToSettle}</span>
          </div>
          
          <div id="emi-calc" class="mt-6 p-6 bg-bg-deep border border-border-main rounded-[2rem] w-full">
             <div class="flex justify-between items-center mb-2">
                <p class="text-[0.5625rem] font-black text-primary uppercase tracking-[0.3em]">Total Amount</p>
                <div class="flex items-center gap-2">
                   <input type="checkbox" id="waive-interest" class="accent-[#f0883e]" />
                   <label for="waive-interest" class="text-[0.5625rem] font-black text-text-dim uppercase tracking-[0.2em] cursor-pointer">Waive Overdue</label>
                </div>
             </div>
             <div class="flex items-center gap-1">
                <span class="text-4xl font-black text-text-main tracking-tighter italic">₹</span>
                <input type="number" id="emi-total" class="w-full bg-transparent text-4xl font-black text-text-main tracking-tighter italic outline-none" value="${pendingInstallments[0]?.outstandingAmount || 0}" />
             </div>
             <div id="emi-breakdown" class="flex items-center gap-4 mt-2">
                <div class="flex flex-col">
                   <span class="text-[0.5rem] font-black text-text-dim uppercase tracking-widest">Current EMI</span>
                   <span id="lbl-current-emi" class="text-xs font-black text-text-main italic">₹0</span>
                </div>
                <div class="flex flex-col">
                   <span class="text-[0.5rem] font-black text-text-dim uppercase tracking-widest">Prev. Outstanding</span>
                   <span id="lbl-prev-emi" class="text-xs font-black text-rose-500 italic">₹0</span>
                </div>
             </div>
             <p id="emi-overdue-display" class="text-xs font-black text-rose-500 tracking-tighter italic mt-2">Includes ${formatINR(pendingInstallments[0]?.overdueInterest || 0)} Overdue</p>
             <input type="text" id="waiver-reason" placeholder="Reason for waiver..." class="w-full mt-3 px-3 py-2 bg-[#0d1117] border border-border-main rounded-md text-xs text-white hidden outline-none focus:border-[#f0883e]" />
             <div class="flex items-center gap-2 mt-4">
                <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <p id="emi-desc" class="text-[0.625rem] font-black text-text-dim uppercase tracking-tight">Installment #${pendingInstallments[0]?.installment || pendingInstallments[0]?.installmentNo} Payment</p>
             </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Pay Now',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f0883e',
      cancelButtonColor: '#64748b',
      background: document.documentElement.classList.contains('dark') ? '#0d1117' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#0f172a',
      customClass: {
        popup: 'rounded-[2.5rem] border border-border-main shadow-2xl',
        title: 'text-2xl font-black uppercase tracking-tighter italic pt-8 text-text-main',
        confirmButton: 'px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[0.625rem] !bg-primary !text-black',
        cancelButton: 'px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[0.625rem]'
      },
      didOpen: () => {
        const range = document.getElementById('emi-range');
        const totalEl = document.getElementById('emi-total');
        const descEl = document.getElementById('emi-desc');
        const overdueDisplay = document.getElementById('emi-overdue-display');
        const waiveCheck = document.getElementById('waive-interest');
        const waiverReason = document.getElementById('waiver-reason');

        const startNum = pendingInstallments[0]?.installment || pendingInstallments[0]?.installmentNo || 1;

        const updateCalc = () => {
          const val = parseInt(range.value);
          const endNum = pendingInstallments[val - 1]?.installment || pendingInstallments[val - 1]?.installmentNo;

          let totalOutstanding = 0;
          let totalOverdue = 0;
          let currentEmiSum = 0;
          let prevOutstandingSum = 0;
          const now = new Date();

          for (let i = 0; i < val; i++) {
            const s = pendingInstallments[i];
            totalOutstanding += (s?.outstandingAmount || 0);
            totalOverdue += (s?.overdueInterest || 0);

            const isPartial = s?.status === 'Partial';
            const dueDate = new Date(s?.dueDate);

            // It is 'previous outstanding' if it was partially paid or if its due date has already passed.
            if (isPartial || dueDate < now) {
              prevOutstandingSum += (s?.outstandingAmount || 0);
            } else {
              currentEmiSum += (s?.outstandingAmount || 0);
            }
          }

          const isWaived = waiveCheck.checked;
          const finalTotal = totalOutstanding + (isWaived ? 0 : totalOverdue);

          totalEl.value = finalTotal;
          document.getElementById('lbl-current-emi').innerText = formatINR(currentEmiSum);
          document.getElementById('lbl-prev-emi').innerText = formatINR(prevOutstandingSum);

          overdueDisplay.innerText = totalOverdue > 0 ? (isWaived ? 'Waived ' + formatINR(totalOverdue) + ' Overdue' : 'Includes ' + formatINR(totalOverdue) + ' Overdue') : '';

          if (isWaived && totalOverdue > 0) {
            waiverReason.classList.remove('hidden');
          } else {
            waiverReason.classList.add('hidden');
          }

          descEl.innerText = val === 1
            ? 'Installment #' + startNum + ' Payment'
            : 'Installments #' + startNum + ' - #' + endNum + ' Payment';
        };

        range.addEventListener('input', updateCalc);
        waiveCheck.addEventListener('change', updateCalc);
        updateCalc();
      },
      preConfirm: () => {
        const rangeVal = parseInt(document.getElementById('emi-range').value);
        const waive = document.getElementById('waive-interest').checked;
        const reason = document.getElementById('waiver-reason').value;

        let totalAmount = 0;
        let totalOverdue = 0;
        for (let i = 0; i < rangeVal; i++) {
          totalOverdue += (pendingInstallments[i]?.overdueInterest || 0);
        }

        const finalAmount = parseFloat(document.getElementById('emi-total').value) || 0;

        if (waive && totalOverdue > 0 && !reason.trim()) {
          Swal.showValidationMessage('Please provide a reason for waiving interest.');
          return false;
        }

        return { count: rangeVal, waiveInterest: waive, waiverReason: reason, amount: finalAmount };
      }
    });

    if (result.isConfirmed) {
      const { count, waiveInterest, waiverReason, amount } = result.value;
      await state.addPayment({
        loanId: loan._id,
        amount: amount,
        count: count,
        waiveInterest,
        waiverReason,
        date: new Date().toISOString(),
        method: 'Digital Settlement',
        transactionId: `TXN${Math.floor(100000 + Math.random() * 899999)}`
      });
      showNotification(`${count} Installment Payment(s) Completed`);
    }
  };

  const [showReportFormats, setShowReportFormats] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reportRef.current && !reportRef.current.contains(event.target)) {
        setShowReportFormats(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExecuteReport = async (format) => {
    setShowReportFormats(false);
    showNotification(`Generating ${format.toUpperCase()} Report...`, 'info');

    try {
      const response = await fetch(`https://afs-emi.vercel.app/api/loans/${loan._id}/report/${format}`, {
        headers: {
          'Authorization': `Bearer ${state.data.user?.token}`
        }
      });

      if (!response.ok) throw new Error('Report Generation Failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : (format === 'ppt' ? 'pptx' : 'pdf');
      const fileName = `Report_${loan.machineName.replace(/\s+/g, '_')}.${ext}`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification(`${format.toUpperCase()} Report Downloaded`);
    } catch (error) {
      console.error('Report error:', error);
      showNotification('Failed to generate report', 'error');
    }
  };

  const handleDownloadReceipt = async (s, index) => {
    const instNum = s.installment || s.installmentNo || (index + 1);
    showNotification(`Downloading PDF receipt for Installment #${instNum}...`, 'info');

    try {
      const response = await fetch(`https://afs-emi.vercel.app/api/loans/${loan._id}/receipt/${instNum}`, {
        headers: {
          'Authorization': `Bearer ${state.data.user?.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF from server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const customerName = (loan.customerId?.name || 'CLIENT').toUpperCase();
      const fileName = `Receipt_${customerName.replace(/\s+/g, '_')}_EMI_${s.installment}.pdf`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('PDF Receipt Downloaded');
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Failed to download receipt', 'error');
    }
  };

  const handleClose = () => {
    state.setState({ selectedLoanId: null });
    state.goBack();
  };

  return (
    <div className="h-[90vh] bg-[#0d1117] text-[#adbac7] flex flex-col overflow-hidden rounded-3xl border border-[#30363d] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <header className="h-14 px-5 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/50 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-2 hover:bg-[#30363d] rounded-lg text-[#768390] transition-colors">
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/30 uppercase tracking-widest">
              FINANCING DETAILS
            </span>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
              {loan.customerId?.name || 'CLIENT PROFILE'}
              <span className="hidden md:block w-px h-4 bg-[#30363d]" />
              <div className="flex items-center gap-4">
                {/* 1. AGREEMENT NUMBER */}
                <div className="flex items-center gap-2">
                  <span className="text-[#444c56] font-mono text-[10px] font-bold uppercase tracking-widest">AGR:</span>
                  <span className="text-white font-mono text-[10px] font-normal tracking-tight uppercase">{loan._id.toUpperCase()}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loan._id.toUpperCase());
                      showNotification('Agreement number copied');
                    }}
                    className="p-1 rounded bg-[#30363d]/50 text-[#f0883e] hover:bg-[#f0883e] hover:text-black transition-all"
                    title="Copy Agreement Number"
                  >
                    <CreditCard size={10} />
                  </button>
                </div>

                <div className="w-px h-3 bg-[#30363d]" />

                {/* 2. SERIAL NUMBER */}
                <div className="flex items-center gap-2">
                  <span className="text-[#444c56] font-mono text-[10px] font-bold uppercase tracking-widest">S/N:</span>
                  <span className="text-white font-mono text-[10px] font-normal tracking-tight uppercase">{loan.invoiceData?.serialNumber || loan.serialNumber || 'SN-8821034'}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loan.invoiceData?.serialNumber || loan.serialNumber || 'SN-8821034');
                      showNotification('Serial number copied');
                    }}
                    className="p-1 rounded bg-[#30363d]/50 text-[#f0883e] hover:bg-[#f0883e] hover:text-black transition-all"
                    title="Copy Serial Number"
                  >
                    <CreditCard size={10} />
                  </button>
                </div>

                <div className="w-px h-3 bg-[#30363d]" />

                {/* 3. INVOICE NUMBER */}
                <div className="flex items-center gap-2">
                  <span className="text-[#444c56] font-mono text-[10px] font-bold uppercase tracking-widest">INV:</span>
                  <span className="text-white font-mono text-[10px] font-normal tracking-tight uppercase">{loan.invoiceNumber || loan.invoiceData?.invoiceNumber || `INV-${loan._id.substring(loan._id.length - 6).toUpperCase()}`}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loan.invoiceNumber || loan.invoiceData?.invoiceNumber || `INV-${loan._id.substring(loan._id.length - 6).toUpperCase()}`);
                      showNotification('Invoice number copied');
                    }}
                    className="p-1 rounded bg-[#30363d]/50 text-[#f0883e] hover:bg-[#f0883e] hover:text-black transition-all"
                    title="Copy Invoice Number"
                  >
                    <CreditCard size={10} />
                  </button>
                </div>
              </div>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={reportRef}>
              <button
                onClick={() => setShowReportFormats(!showReportFormats)}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[#f0883e] border border-[#f0883e]/30 rounded-lg hover:bg-[#f0883e]/10 transition-all"
              >
                <Download size={14} /> DOWNLOAD REPORT
              </button>

              {showReportFormats && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="px-4 py-2 text-[8px] font-black text-[#444c56] uppercase tracking-widest border-b border-[#30363d]">Select Format</p>
                  <button onClick={() => handleExecuteReport('excel')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-[#adbac7] hover:bg-[#30363d] hover:text-[#3fb950] transition-colors border-b border-[#30363d]/50">
                    <FileText size={14} className="text-[#3fb950]" /> EXCEL SPREADSHEET (.xlsx)
                  </button>
                  <button onClick={() => handleExecuteReport('ppt')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-[#adbac7] hover:bg-[#30363d] hover:text-rose-500 transition-colors border-b border-[#30363d]/50">
                    <Maximize2 size={14} className="text-rose-500" /> POWERPOINT PRESENTATION (.pptx)
                  </button>
                  <button onClick={() => handleExecuteReport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-[#adbac7] hover:bg-[#30363d] hover:text-[#f0883e] transition-colors">
                    <ShieldCheck size={14} className="text-[#f0883e]" /> PDF REPORT (.pdf)
                  </button>
                </div>
              )}
            </div>
            {nextInstallment && (
              <button onClick={handleSettleEMI} className="btn-primary flex items-center gap-2 !py-1.5 !px-4 !text-[10px]">
                <Zap size={14} /> SETTLE EMI
              </button>
            )}
            <button onClick={handleClose} className="p-1.5 hover:bg-rose-500/10 rounded-md transition-colors text-[#768390] hover:text-rose-500">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* CONTENT GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-[#30363d] overflow-y-auto lg:overflow-hidden">

          {/* COLUMN 1: ASSET & TERMS */}
          <div className="lg:col-span-3 bg-[#161b22] p-5 flex flex-col gap-5 lg:overflow-y-auto">
            <div className="relative group rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117] aspect-video shrink-0 shadow-lg">
              <img src={machine.img || (machine.images && machine.images[0]) || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1200'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <div>
                  <h3 className="text-sm font-black text-white leading-tight uppercase italic">{machine.name}</h3>
                  <p className="text-[9px] text-white/50 font-bold uppercase tracking-widest">{machine.model}</p>
                </div>
              </div>
            </div>

            <section className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg shrink-0">
              <h4 className="text-[9px] font-bold text-[#768390] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Settings size={12} className="text-[#f0883e]" /> CONTRACT DETAILS
              </h4>
              <div className="space-y-3">
                <TermRow label="Principal" value={`₹${(loan.principal / 100000).toFixed(1)}L`} />
                <TermRow label="Annual Rate" value={`${loan.interestRate}%`} />
                <TermRow label="Tenure" value={`${loan.tenure} Years`} />
                <TermRow label="Total Value" value={formatINR(actualTotalValue)} />
                <div className="h-px bg-[#30363d] my-2" />
                <TermRow label="Last Payment" value={loan.schedule.filter(s => s.status === 'Paid').pop()?.dueDate || '--'} />
                <TermRow label="Next Payment" value={loan.schedule.find(s => s.status === 'Pending')?.dueDate || 'COMPLETED'} />
              </div>
            </section>

          </div>

          {/* COLUMN 2: FINANCIAL METRICS & LEDGER */}
          <div className="lg:col-span-9 bg-[#161b22] flex flex-col overflow-visible lg:overflow-hidden">
            <div className="p-5 grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-5 bg-[#0d1117]/50 border-b border-[#30363d] shrink-0">
              <StatBox label="TOTAL AMOUNT" value={formatINR(actualTotalValue)} icon={PieChart} color="text-emerald-400" />
              <StatBox label="NEXT EMI" value={formatINR(nextInstallment ? ((nextInstallment.outstandingAmount !== undefined ? nextInstallment.outstandingAmount : nextInstallment.emi) + (loanScheduleWithDynamics.find(s => s.installment === nextInstallment.installment || s.installmentNo === nextInstallment.installmentNo)?._dynamicDelayInt || 0)) : 0)} icon={CreditCard} color="text-[#f0883e]" />
              <StatBox label="RECEIVED AMOUNT" value={formatINR(actualTotalPaidAmt)} icon={TrendingUp} color="text-[#3fb950]" />
              <StatBox label="OUTSTANDING BALANCE" value={formatINR(totalOutstandingBalance)} icon={AlertCircle} color="text-white" />
              <StatBox label="OVERDUE INTEREST" value={formatINR(totalOverdueInterest)} icon={History} color="text-rose-500" />
              <StatBox label="LAST PAYMENT" value={loanScheduleWithDynamics.filter(s => s.status === 'Paid' || s.status === 'Clear').pop()?.dueDate || '--'} icon={Calendar} color="text-[#768390]" />
              <StatBox label="NEXT PAYMENT" value={loanScheduleWithDynamics.find(s => s.status === 'Pending' || s.status === 'Partial')?.dueDate || 'DONE'} icon={Clock} color="text-[#58a6ff]" />
            </div>

            <div className="flex-1 p-5 flex flex-col overflow-visible lg:overflow-hidden">
              <div className="flex items-center justify-between mb-5 shrink-0">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Repayment Schedule</h3>
                    <p className="text-[9px] text-[#768390] font-bold uppercase tracking-widest mt-0.5">Financing Schedule Details</p>
                  </div>
                  <div className="h-8 w-px bg-[#30363d]" />
                  <div className="flex p-1 bg-[#0d1117] border border-[#30363d] rounded-xl">
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'schedule' ? 'bg-[#30363d] text-[#f0883e]' : 'text-[#444c56] hover:text-[#768390]'}`}
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-[#30363d] text-[#3fb950]' : 'text-[#444c56] hover:text-[#768390]'}`}
                    >
                      History
                    </button>
                    <button
                      onClick={() => setActiveTab('overdue')}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'overdue' ? 'bg-[#30363d] text-rose-500' : 'text-[#444c56] hover:text-[#768390]'}`}
                    >
                      Overdue Interest
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[8px] font-black text-[#768390] uppercase block">Progress</span>
                    <span className="text-sm font-black text-[#f0883e] font-mono italic">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-24 h-1.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                    <div className="h-full bg-[#f0883e] shadow-[0_0_10px_rgba(240,136,62,0.5)]" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0">
                  {activeTab === 'schedule' ? (
                    <table className="w-full text-center border-collapse">
                      <thead className="sticky top-0 bg-[#1c2128] z-10 border-b border-[#30363d]">
                        <tr className="text-[9px] font-bold text-[#768390] uppercase tracking-widest">
                          <th className="px-5 py-3 font-mono text-center">#ID</th>
                          <th className="px-5 py-3 text-center">Type</th>
                          <th className="px-5 py-3 text-center">Due Date</th>
                          <th className="px-5 py-3 text-center">EMI</th>
                          <th className="px-5 py-3 text-center">Overdue</th>
                          {/* <th className="px-5 py-3 text-center text-red-500">Overdue</th> */}
                          <th className="px-5 py-3 text-center">Delay Int.</th>
                          <th className="px-5 py-3 text-center text-[#f0883e]">Next EMI</th>
                          <th className="px-5 py-3 text-center">Paid Date</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]/50">
                        {loanScheduleWithDynamics.map((s, index) => (
                          <tr key={s.installment} className="hover:bg-[#f0883e]/5 transition-colors group">
                            <td className="px-5 py-2.5 text-[10px] font-mono font-bold text-[#444c56] group-hover:text-[#f0883e] transition-colors">{`#${(index + 1).toString().padStart(2, '0')}`}</td>
                            <td className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-dim">
                              {s.type === 'DownPayment' ? <span className="text-[#3fb950]">MARGIN MONEY</span> : <span>EMI</span>}
                            </td>
                            <td className="px-5 py-2.5 text-[10px] font-bold text-white uppercase italic">{s.dueDate}</td>
                            <td className="px-5 py-2.5 text-[10px] font-mono font-bold text-white text-center italic">{formatINR(s.emi)}</td>
                            <td className="px-5 py-2.5 text-[10px] font-mono text-center">
                              {(() => {
                                if (s.status === 'Paid' || s.status === 'Clear') {
                                  return (
                                    <div className="flex flex-col items-center">
                                      <span className="text-[#3fb950] font-bold">Paid: {formatINR(s.paidAmount || s.emi)}</span>
                                      {s._overdueAmt > 0 && <span className="text-red-500 font-bold mt-0.5 text-[8px]">OD: {formatINR(s._overdueAmt)}</span>}
                                    </div>
                                  );
                                }
                                if (s.status === 'Partial') {
                                  const paidAmt = s.paidAmount || (s.emi - s.outstandingAmount);
                                  return (
                                    <div className="flex flex-col items-center">
                                      <span className="text-[#3fb950] font-bold text-[8px]">Paid: {formatINR(paidAmt)}</span>
                                      <span className="text-red-500 font-bold mt-0.5">{s._overdueAmt > 0 ? `OD: ${formatINR(s._overdueAmt)}` : '₹0'}</span>
                                    </div>
                                  );
                                }
                                return <span className={s._overdueAmt > 0 ? "text-red-500 font-bold" : "text-[#768390]"}>{s._overdueAmt > 0 ? formatINR(s._overdueAmt) : '₹0'}</span>;
                              })()}
                            </td>
                            <td className="px-5 py-2.5 text-center text-[10px] font-mono text-rose-500">
                              {s._dynamicDelayInt > 0 ? <div>{formatINR(s._dynamicDelayInt)}</div> : null}
                              {s.paidOverdueInterest > 0 ? <div className="text-green-500">Paid: {formatINR(s.paidOverdueInterest)}</div> : null}
                              {s._dynamicDelayInt <= 0 && (!s.paidOverdueInterest || s.paidOverdueInterest <= 0) ? '--' : null}
                            </td>
                            <td className="px-5 py-2.5 text-center text-[10px] font-mono font-bold text-[#f0883e]">
                              {s.status === 'Paid' ? '—' : formatINR((s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi) + (s._dynamicDelayInt || 0))}
                            </td>
                            <td className="px-5 py-2.5 text-[10px] font-bold text-[#768390] uppercase italic">{s.paidDate ? new Date(s.paidDate).toISOString().split('T')[0] : '--'}</td>
                            <td className="px-5 py-2.5 text-center">
                              <div className="flex items-center justify-center">
                                {s.status === 'Paid' ? (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3fb950]/10 text-[#3fb950] rounded border border-[#3fb950]/20 text-[8px] font-bold uppercase tracking-tighter">
                                    <CheckCircle2 size={10} /> CLEAR
                                  </span>
                                ) : s.status === 'Partial' ? (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 text-[8px] font-bold uppercase tracking-tighter">
                                    <Clock size={10} /> PARTIAL
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f0883e]/10 text-[#f0883e] rounded border border-[#f0883e]/20 text-[8px] font-bold uppercase tracking-tighter">
                                    <History size={10} /> PENDING
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              {s.status === 'Paid' ? (
                                <button
                                  onClick={() => handleDownloadReceipt(s, index)}
                                  className="p-1.5 hover:bg-[#f0883e]/20 rounded-md text-[#f0883e] transition-all"
                                  title="Download Receipt"
                                >
                                  <Download size={14} />
                                </button>
                              ) : (
                                <span className="text-[#444c56] opacity-30 cursor-not-allowed">
                                  <Download size={14} />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : activeTab === 'history' ? (
                    <table className="w-full text-center border-collapse">
                      <thead className="sticky top-0 bg-[#1c2128] z-10 border-b border-[#30363d]">
                        <tr className="text-[9px] font-bold text-[#768390] uppercase tracking-widest">
                          <th className="px-5 py-3 font-mono text-center">TXN ID</th>
                          <th className="px-5 py-3 text-center">Date</th>
                          <th className="px-5 py-3 text-center">Amount</th>
                          <th className="px-5 py-3 text-center">Allocations</th>
                          <th className="px-5 py-3 text-center">Waived</th>
                          <th className="px-5 py-3 text-center">Method</th>
                          <th className="px-5 py-3 text-center">Processed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]/50">
                        {payments.filter(p => (p.loanId?._id === loan._id) || (p.loanId === loan._id)).length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-5 py-10 text-center">
                              <History size={24} className="mx-auto text-[#768390]/30 mb-2" />
                              <p className="text-[10px] text-[#768390] font-bold uppercase tracking-widest">No payment history found</p>
                            </td>
                          </tr>
                        ) : (
                          payments.filter(p => (p.loanId?._id === loan._id) || (p.loanId === loan._id)).sort((a, b) => new Date(b.date) - new Date(a.date)).map((p, i) => (
                            <tr key={i} className="hover:bg-[#3fb950]/5 transition-colors group">
                              <td className="px-5 py-3 text-[10px] font-mono font-bold text-[#444c56]">{p.transactionId || '--'}</td>
                              <td className="px-5 py-3 text-[10px] font-bold text-white uppercase italic">{new Date(p.date).toISOString().split('T')[0]}</td>
                              <td className="px-5 py-3 text-[10px] font-mono font-bold text-[#3fb950] italic">{formatINR(p.amount)}</td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-1">
                                  {p.allocations && p.allocations.length > 0 ? p.allocations.map((a, j) => (
                                    <span key={j} className="text-[8px] font-mono text-[#768390]">
                                      Inst #{a.installmentNo} • {a.type}: <span className="text-white">{formatINR(a.amount)}</span>
                                    </span>
                                  )) : <span className="text-[8px] font-mono text-[#768390]">No specific allocations</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-[10px] font-mono text-rose-500">
                                {p.waiveInterest ? (
                                  <span className="flex items-center gap-1"><CheckCircle2 size={10} /> WAIVED</span>
                                ) : '--'}
                              </td>
                              <td className="px-5 py-3 text-[10px] font-bold text-[#768390] uppercase tracking-widest">{p.method || 'Digital'}</td>
                              <td className="px-5 py-3 text-[10px] font-bold text-white italic">{p.uploadedBy?.name || 'System'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center">
                      <History size={48} className="mx-auto text-rose-500/20 mb-4" />
                      <h3 className="text-sm font-black text-white uppercase italic mb-2">Overdue Interest</h3>
                      <p className="text-[10px] text-[#768390] font-bold uppercase tracking-widest max-w-xs mx-auto mb-6">Penalty calculation based on standard contract grace period and delay dates.</p>
                      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                          <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Grace Period</p>
                          <p className="text-lg font-black text-white italic">05 DAYS</p>
                        </div>
                        <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                          <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Penalty Rate</p>
                          <p className="text-lg font-black text-rose-500 italic">{(loan.delayInterest || 24).toFixed(1)}% PA</p>
                        </div>
                        <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                          <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Total Accrued</p>
                          <p className="text-lg font-black text-[#f0883e] italic">{formatINR(totalOverdueInterest)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER BAR */}
        <footer className="h-8 px-5 border-t border-[#30363d] flex items-center justify-between bg-[#0d1117]/30 text-[8px] font-mono text-[#444c56] uppercase tracking-wider shrink-0">
          <div className="flex gap-6">
            <span>STAMP: 2024.05.08</span>
            <span>SYSTEM ONLINE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" /> SECURED</span>
            <span className="text-[#adbac7]">{new Date().toLocaleTimeString()}</span>
          </div>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444c56; }
      `}} />
    </div>
  );
};

const TermRow = ({ label, value }) => (
  <div className="flex justify-between items-center group">
    <span className="text-[9px] font-bold text-[#768390] uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
    <span className="text-[10px] font-black text-white italic font-mono">{value}</span>
  </div>
);

const StatBox = ({ label, value, icon: Icon, color }) => (
  <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-[#f0883e]/30 transition-all group">
    <div className="flex justify-between items-start mb-1.5">
      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest">{label}</p>
      <Icon size={14} className={color} />
    </div>
    <p className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</p>
  </div>
);

export default LoanDetails;

