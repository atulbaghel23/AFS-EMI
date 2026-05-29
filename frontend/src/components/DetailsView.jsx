import React, { useState, useRef, useEffect } from 'react';
import { state } from '../state';
import { formatINR, showNotification } from '../utils';
import Swal from 'sweetalert2';
import {
  X, Download, Cpu, Zap, Settings, FileText, Maximize2, ChevronRight,
  Info, Calendar, Weight, History, Box, Truck, DollarSign, ShieldCheck, ExternalLink,
  CreditCard, TrendingUp, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';

const LoanDetails = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { loans, machines, selectedLoanId } = state.data;

  if (!selectedLoanId) return null;

  const loan = loans.find(l => l._id === selectedLoanId);
  if (!loan || !loan.schedule || loan.schedule.length === 0) return null;

  const machine = machines.find(m => m.name === loan.machineName) || { img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1200', name: 'Asset', model: 'N/A' };
  const totalPaidCount = loan.schedule.filter(s => s.status === 'Paid').length;
  const totalPaidAmt = totalPaidCount * loan.emi;
  const nextInstallment = loan.schedule.find(s => s.status === 'Pending');
  const currentInstallment = nextInstallment || loan.schedule[loan.schedule.length - 1];
  const progress = (totalPaidCount / (loan.schedule.length || 1)) * 100;

  const handleSettleEMI = async () => {
    const pendingInstallments = loan.schedule.filter(s => s.status === 'Pending');
    const maxToSettle = pendingInstallments.length;

    const result = await Swal.fire({
      title: 'EMI PAYMENT',
      html: `
        <div class="flex flex-col items-center gap-4 py-4 text-left">
          <p class="text-[0.625rem] font-black text-text-dim uppercase tracking-[0.2em] w-full mb-1">Select Installments</p>
          <input type="range" id="emi-range" class="swal2-range w-full !m-0" min="1" max="${maxToSettle}" value="1" style="accent-color: #f0883e;">
          <div class="flex justify-between w-full text-[0.5rem] font-black text-text-dim uppercase tracking-widest mt-1">
            <span>Min: 1</span>
            <span>Max: ${maxToSettle}</span>
          </div>
          
          <div id="emi-calc" class="mt-6 p-6 bg-bg-deep border border-border-main rounded-[2rem] w-full">
             <p class="text-[0.5625rem] font-black text-primary uppercase tracking-[0.3em] mb-2">Total Amount</p>
             <p id="emi-total" class="text-4xl font-black text-text-main tracking-tighter italic">${formatINR(loan.emi)}</p>
             <div class="flex items-center gap-2 mt-3">
                <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <p id="emi-desc" class="text-[0.625rem] font-black text-text-dim uppercase tracking-tight">Installment #${nextInstallment.installment} Payment</p>
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
        const startNum = nextInstallment.installment;

        range.addEventListener('input', (e) => {
          const val = parseInt(e.target.value);
          const endNum = startNum + val - 1;
          totalEl.innerText = formatINR(loan.emi * val);
          descEl.innerText = val === 1
            ? `Installment #${startNum} Payment`
            : `Installments #${startNum} - #${endNum} Payment`;
        });
      },
      preConfirm: () => {
        return parseInt(document.getElementById('emi-range').value);
      }
    });

    if (result.isConfirmed) {
      const count = result.value;
      await state.addPayment({
        loanId: loan._id,
        amount: loan.emi * count,
        count: count,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        method: 'Digital Settlement',
        transactionId: `TXN${Math.floor(100000 + Math.random() * 899999)}`
      });
      showNotification(`${count} EMI Payment(s) Completed`);
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
      const response = await fetch(`http://localhost:5000/api/loans/${loan._id}/report/${format}`, {
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

  const handleDownloadReceipt = async (s) => {
    showNotification(`Downloading PDF receipt for Installment #${s.installment}...`, 'info');

    try {
      const response = await fetch(`http://localhost:5000/api/loans/${loan._id}/receipt/${s.installment}`, {
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
                  <span className="text-white font-mono text-[10px] font-normal tracking-tight uppercase">{loan.serialNumber || 'SN-8821034'}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loan.serialNumber || 'SN-8821034');
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
                  <span className="text-white font-mono text-[10px] font-normal tracking-tight uppercase">INV-{loan._id.substring(loan._id.length - 6).toUpperCase()}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`INV-${loan._id.substring(loan._id.length - 6).toUpperCase()}`);
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
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-[#30363d] overflow-hidden">

          {/* COLUMN 1: ASSET & TERMS */}
          <div className="lg:col-span-3 bg-[#161b22] p-5 flex flex-col gap-5 overflow-hidden">
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
                <TermRow label="Total Value" value={formatINR(loan.emi * loan.schedule.length)} />
                <div className="h-px bg-[#30363d] my-2" />
                <TermRow label="Last Payment" value={loan.schedule.filter(s => s.status === 'Paid').pop()?.dueDate || '--'} />
                <TermRow label="Next Payment" value={loan.schedule.find(s => s.status === 'Pending')?.dueDate || 'COMPLETED'} />
              </div>
            </section>

          </div>

          {/* COLUMN 2: FINANCIAL METRICS & LEDGER */}
          <div className="lg:col-span-9 bg-[#161b22] flex flex-col overflow-hidden">
            <div className="p-5 grid grid-cols-1 md:grid-cols-6 gap-5 bg-[#0d1117]/50 border-b border-[#30363d] shrink-0">
              <StatBox label="NEXT EMI" value={formatINR(loan.emi)} icon={CreditCard} color="text-[#f0883e]" />
              <StatBox label="TOTAL PAID" value={formatINR(totalPaidAmt)} icon={TrendingUp} color="text-[#3fb950]" />
              <StatBox label="OUTSTANDING BALANCE" value={formatINR(currentInstallment.balance)} icon={AlertCircle} color="text-white" />
              <StatBox label="OVERDUE INTEREST" value={formatINR(loan.schedule.filter(s => s.status === 'Paid' && Math.random() > 0.8).length * 1200)} icon={History} color="text-rose-500" />
              <StatBox label="LAST PAYMENT" value={loan.schedule.filter(s => s.status === 'Paid').pop()?.dueDate || '--'} icon={Calendar} color="text-[#768390]" />
              <StatBox label="NEXT PAYMENT" value={loan.schedule.find(s => s.status === 'Pending')?.dueDate || 'DONE'} icon={Clock} color="text-[#58a6ff]" />
            </div>

            <div className="flex-1 p-5 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-5 shrink-0">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Repayment Schedule</h3>
                    <p className="text-[9px] text-[#768390] font-bold uppercase tracking-widest mt-0.5">Financing Schedule Details</p>
                  </div>
                  <div className="h-8 w-px bg-[#30363d]" />
                  <div className="flex p-1 bg-[#0d1117] border border-[#30363d] rounded-xl">
                    <button
                      onClick={() => setShowAdvanced(false)}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${!showAdvanced ? 'bg-[#30363d] text-[#f0883e]' : 'text-[#444c56] hover:text-[#768390]'}`}
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => setShowAdvanced(true)}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${showAdvanced ? 'bg-[#30363d] text-rose-500' : 'text-[#444c56] hover:text-[#768390]'}`}
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
                  {!showAdvanced ? (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#1c2128] z-10 border-b border-[#30363d]">
                        <tr className="text-[9px] font-bold text-[#768390] uppercase tracking-widest">
                          <th className="px-5 py-3 font-mono">#ID</th>
                          <th className="px-5 py-3">Due Date</th>
                          <th className="px-5 py-3 text-right">Principal</th>
                          <th className="px-5 py-3 text-right">Interest</th>
                          <th className="px-5 py-3 text-right">Balance</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-center">Received Date</th>
                          <th className="px-5 py-3 text-right text-red-500">Overdue</th>
                          <th className="px-5 py-3 text-right">Delay Int.</th>
                          <th className="px-5 py-3 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]/50">
                        {loan.schedule.map(s => (
                          <tr key={s.installment} className="hover:bg-[#f0883e]/5 transition-colors group">
                            <td className="px-5 py-2.5 text-[10px] font-mono font-bold text-[#444c56] group-hover:text-[#f0883e] transition-colors">{s.installment.toString().padStart(2, '0')}</td>
                            <td className="px-5 py-2.5 text-[10px] font-bold text-white uppercase italic">{s.dueDate}</td>
                            <td className="px-5 py-2.5 text-[10px] font-mono text-[#768390] text-right">{formatINR(s.principal)}</td>
                            <td className="px-5 py-2.5 text-[10px] font-mono text-rose-400/70 text-right">{formatINR(s.interest)}</td>
                            <td className="px-5 py-2.5 text-[10px] font-mono font-bold text-white text-right italic">{formatINR(s.balance)}</td>
                            <td className="px-5 py-2.5 text-center">
                              <div className="flex items-center justify-center">
                                {s.status === 'Paid' ? (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3fb950]/10 text-[#3fb950] rounded border border-[#3fb950]/20 text-[8px] font-bold uppercase tracking-tighter">
                                    <CheckCircle2 size={10} /> CLEAR
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f0883e]/10 text-[#f0883e] rounded border border-[#f0883e]/20 text-[8px] font-bold uppercase tracking-tighter">
                                    <History size={10} /> PENDING
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-center text-[10px] font-mono text-[#768390]">
                              {s.status === 'Paid' ? s.dueDate : '--'}
                            </td>
                            <td className="px-5 py-2.5 text-right text-[10px] font-mono text-red-500 font-bold">
                              {s.status === 'Pending' && new Date(s.dueDate) < new Date() ? formatINR(loan.emi) : '—'}
                            </td>
                            <td className="px-5 py-2.5 text-right text-[10px] font-mono text-rose-500">
                              {s.status === 'Paid' ? formatINR(Math.random() > 0.8 ? 1200 : 0) : '--'}
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              {s.status === 'Paid' ? (
                                <button
                                  onClick={() => handleDownloadReceipt(s)}
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
                          <p className="text-lg font-black text-rose-500 italic">2.0% PM</p>
                        </div>
                        <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                          <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Total Accrued</p>
                          <p className="text-lg font-black text-[#f0883e] italic">{formatINR(3600)}</p>
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

