import React, { useState, useEffect } from 'react';
import { state } from '../state';
import { showNotification, formatINR, hasPermission } from '../utils';
import { Download, Upload, Mail, CheckCircle, Truck, FileText, AlertCircle, FileCheck, X, Check, ListOrdered, CalendarCheck, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const getMachineImage = (m) => {
  if (!m) return 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=300';
  return (m.images && m.images.length > 0 ? m.images[0] : m.img) || 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=300';
};

const FinancingFormModal = ({ loan, onClose }) => {
  const { user, approvalFlows = [], employees = [], machines = [], customers = [] } = state.data;
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewTab, setViewTab] = useState('data'); // 'data' or 'schedule'

  const machine = machines.find(m => m.name === loan.machineName);
  const customer = customers.find(c => c._id === loan.customerId || c._id === loan.customerId?._id);

  const getTicketActiveApproverId = (l) => {
    if (!l || ['Approved', 'Rejected'].includes(l.approvalStatus)) return null;

    let flow = null;
    if (l.approvalFlowId) {
      flow = approvalFlows.find(f => f._id?.toString() === (l.approvalFlowId._id || l.approvalFlowId).toString());
    }
    if (!flow) return null;

    const stepIdx = l.approvalStep || 0;
    if (stepIdx >= flow.steps.length) return null;

    const activeStep = flow.steps[stepIdx];
    if (!activeStep) return null;

    return (activeStep.approverId?._id || activeStep.approverId)?.toString() || null;
  };

  const getStepApproverName = (step) => {
    const stepApprover = step.approverId || {};
    return stepApprover.name || 'Designated Approver';
  };

  const activeFlow = approvalFlows.find(f => f._id?.toString() === (loan.approvalFlowId?._id || loan.approvalFlowId)?.toString());
  const currentStepIndex = loan.approvalStep || 0;

  const handleApproveAction = async (action) => {
    const result = await state.approveLoan(loan._id, action, approvalNotes);
    if (result.success) {
      showNotification(`Financing ${action === 'Approved' ? 'Approved' : 'Rejected'} successfully`, 'success');
      onClose();
    } else {
      showNotification(result.message || 'Operation failed', 'error');
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${state.apiUrl}/loans/${loan._id}/agreement/download`, {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Agreement_${loan._id}.pdf`;
        a.click();
      } else {
        showNotification('Failed to download agreement', 'error');
      }
    } catch (e) {
      showNotification('Download failed', 'error');
    }
  };

  const handleSendEmail = async () => {
    try {
      const res = await fetch(`${state.apiUrl}/loans/${loan._id}/agreement/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` }
      });
      if (res.ok) {
        showNotification('Agreement sent to customer successfully', 'success');
      } else {
        showNotification('Failed to send email', 'error');
      }
    } catch (e) {
      showNotification('Email dispatch failed', 'error');
    }
  };

  const handleUploadAgreement = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${state.apiUrl}/upload/agreement/${loan._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
        body: formData
      });
      if (res.ok) {
        showNotification('Signed Agreement uploaded successfully', 'success');
        state.fetchData();
        setSelectedFile(null);
      } else {
        showNotification('Upload failed', 'error');
      }
    } catch (e) {
      showNotification('Upload failed', 'error');
    }
  };

  const handleDownloadSigned = async () => {
    try {
      const url = `${state.apiUrl.replace('/api', '')}${loan.agreementUrl}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `Signed_Agreement_${loan.machineName.replace(/\s+/g, '_')}.pdf`;
      a.click();
    } catch (e) {
      showNotification('Failed to download document', 'error');
    }
  };

  const handleUploadInvoice = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${state.apiUrl}/upload/invoice/${loan._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
        body: formData
      });
      if (res.ok) {
        const updatedLoan = await res.json();
        showNotification('Invoice uploaded successfully');
        if (updatedLoan.invoiceNumber) {
          showNotification(`Extracted Invoice Number: ${updatedLoan.invoiceNumber}`, 'info');
        }
        state.fetchData();
        setSelectedFile(null);
      } else {
        const err = await res.json();
        console.error("Upload error:", err);
        showNotification(`Upload failed: ${err.message || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      console.error("Upload exception:", e);
      showNotification('Upload failed', 'error');
    }
  };

  const handleDispatch = async () => {
    try {
      const res = await fetch(`${state.apiUrl}/loans/${loan._id}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` }
      });
      if (res.ok) {
        showNotification('Machine dispatched. Loan is now active.');
        state.fetchData();
      }
    } catch (e) {
      showNotification('Dispatch confirmation failed', 'error');
    }
  };

  const handleApproveScheduling = async () => {
    try {
      const res = await fetch(`${state.apiUrl}/loans/${loan._id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({ notes: approvalNotes })
      });
      if (res.ok) {
        showNotification('Scheduling Approved Successfully', 'success');
        state.fetchData();
        setApprovalNotes('');
      } else {
        showNotification('Scheduling approval failed', 'error');
      }
    } catch (e) {
      showNotification('Scheduling approval failed', 'error');
    }
  };


  const getStageStatus = () => {
    if (['Rejected'].includes(loan.approvalStatus)) return -1;
    if (['Pending Scheduling'].includes(loan.approvalStatus)) return 2;
    if (['Pending Invoice', 'Invoice Uploaded'].includes(loan.approvalStatus)) return 3;
    if (['Active'].includes(loan.approvalStatus)) return 4;
    return 1; // Default to Stage 1: Approval Stage
  };
  const currentStage = getStageStatus();
  const [viewStage, setViewStage] = useState(currentStage);

  useEffect(() => {
    setViewStage(currentStage);
  }, [currentStage]);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col animate-in fade-in duration-300">
      <div className="flex-1 bg-bg-card border border-border-main rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-0">
        <div className="px-8 py-5 border-b border-border-main flex items-center justify-between shrink-0 bg-bg-deep">
          <div>
            <h2 className="text-lg font-black text-text-main uppercase">
              Financing Approval Protocol
            </h2>
            <p className="text-[9px] font-mono text-text-dim/60 uppercase tracking-widest">{loan.machineName} - {customer?.name || 'Unknown Client'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-active rounded-xl text-text-dim hover:text-text-main transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-8">

          <div className="flex items-center justify-between mb-10 relative px-10">
            <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-bg-active -z-10 rounded-full"></div>
            <div className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500 rounded-full" style={{ width: `calc(${(Math.max((currentStage - 1) / 2, 0) * 100)}% - 40px)` }}></div>

            <div onClick={() => currentStage >= 1 && setViewStage(1)} className={`flex flex-col items-center gap-2 ${currentStage >= 1 ? 'opacity-100 cursor-pointer hover:scale-105' : 'opacity-50'} transition-all`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${viewStage === 1 ? 'ring-4 ring-primary/30' : ''} ${currentStage > 1 ? 'bg-primary text-white shadow-[0_0_15px_var(--color-primary)]' : currentStage === 1 ? 'bg-bg-card border-2 border-primary text-primary shadow-[0_0_15px_rgba(240,136,62,0.3)]' : 'bg-bg-active text-text-dim'}`}>1</div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-main">Approval Stage</span>
            </div>

            <div onClick={() => currentStage >= 2 && setViewStage(2)} className={`flex flex-col items-center gap-2 ${currentStage >= 2 ? 'opacity-100 cursor-pointer hover:scale-105' : 'opacity-50'} transition-all`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${viewStage === 2 ? 'ring-4 ring-primary/30' : ''} ${currentStage > 2 ? 'bg-primary text-white shadow-[0_0_15px_var(--color-primary)]' : currentStage === 2 ? 'bg-bg-card border-2 border-primary text-primary shadow-[0_0_15px_rgba(240,136,62,0.3)]' : 'bg-bg-active text-text-dim'}`}>2</div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-main">Scheduling Stage</span>
            </div>

            <div onClick={() => currentStage >= 3 && setViewStage(3)} className={`flex flex-col items-center gap-2 ${currentStage >= 3 ? 'opacity-100 cursor-pointer hover:scale-105' : 'opacity-50'} transition-all`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${viewStage === 3 ? 'ring-4 ring-primary/30' : ''} ${currentStage > 3 ? 'bg-primary text-white shadow-[0_0_15px_var(--color-primary)]' : currentStage === 3 ? 'bg-bg-card border-2 border-primary text-primary shadow-[0_0_15px_rgba(240,136,62,0.3)]' : 'bg-bg-active text-text-dim'}`}>3</div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-main">Invoice Stage</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden">
            <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0 order-1">
              <div className="bg-bg-card border border-border-main rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <img src={getMachineImage(machine)} alt={loan.machineName} className="w-full h-48 object-cover border-b border-border-main" />
                <div className="p-4 space-y-4 bg-bg-deep">
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Client Name</p>
                    <p className="text-sm font-black text-text-main">{customer?.name || 'Unknown Client'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Equipment Model</p>
                    <p className="text-sm font-black text-text-main">{loan.machineName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 min-h-0 flex flex-col bg-bg-card border border-border-main rounded-2xl shadow-xl overflow-hidden order-2">
              <div className="bg-bg-active border-b border-border-main p-4 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => setViewTab('data')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'data' ? 'bg-[#f0883e] text-black shadow-lg shadow-[#f0883e]/20' : 'bg-bg-deep text-text-dim border border-border-main hover:text-text-main hover:border-[#f0883e]/50'}`}>Remaining Data</button>
                  <button onClick={() => setViewTab('schedule')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'schedule' ? 'bg-[#f0883e] text-black shadow-lg shadow-[#f0883e]/20' : 'bg-bg-deep text-text-dim border border-border-main hover:text-text-main hover:border-[#f0883e]/50'}`}>Schedule</button>
                </div>
                {viewTab === 'schedule' && <span className="text-primary font-black text-[10px] uppercase">{loan.schedule?.length || 0} Installments</span>}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {viewTab === 'data' ? (
                  <div className="flex flex-col gap-6 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Principal Amount</p>
                        <p className="text-sm font-black text-text-main">{formatINR(loan.principal)}</p>
                      </div>
                      <div className="bg-[#f0883e]/5 p-3 rounded-xl border border-[#f0883e]/20">
                        <p className="text-[9px] font-bold text-[#f0883e] uppercase tracking-wider mb-1">Monthly EMI</p>
                        <p className="text-sm font-black text-text-main">{formatINR(loan.emi)}</p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Tenure</p>
                        <p className="text-sm font-black text-text-main">{loan.tenure} Months</p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Down Payment</p>
                        <p className="text-sm font-black text-text-main">{formatINR(loan.downPayment)}</p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Discount</p>
                        <p className="text-sm font-black text-text-main">{loan.discountPercentage || 0}% ({formatINR(loan.discountAmount || 0)})</p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Interest Rate</p>
                        <p className="text-sm font-black text-text-main">{loan.interestRate || 0}% p.a.</p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">EMI Start Date</p>
                        <p className="text-sm font-black text-text-main">
                          {loan.emiStartDate ? new Date(loan.emiStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Overdue Interest</p>
                        <p className="text-sm font-black text-text-main">{loan.delayInterest !== undefined ? loan.delayInterest : 2}% / month</p>
                      </div>
                      <div className="bg-bg-deep p-3 rounded-xl border border-border-main">
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Est. End Date</p>
                        <p className="text-sm font-black text-text-main">
                          {loan.emiStartDate && loan.tenure ? (() => {
                            const d = new Date(loan.emiStartDate);
                            d.setMonth(d.getMonth() + parseInt(loan.tenure));
                            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          })() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="border border-border-main rounded-2xl overflow-hidden shadow-xl bg-bg-deep">
                      <div className="bg-bg-card p-4 border-b border-border-main flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-wider flex items-center gap-2">
                          Asset Valuation Breakdown
                        </h4>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-border-main/30">
                          <div>
                            <span className="text-[10px] font-bold text-text-dim uppercase block">Base Asset Value</span>
                            <span className="text-[9px] font-black text-primary uppercase tracking-wider">{loan.machineName} {machine?.model ? `(${machine.model})` : ''}</span>
                          </div>
                          <span className="text-xs font-black text-text-main">{formatINR(loan.machinePrice || (machine?.pricing?.totalPrice || 0))}</span>
                        </div>

                        {loan.discountAmount > 0 && (
                          <div className="flex justify-between items-center pb-2 border-b border-border-main/30">
                            <span className="text-[10px] font-bold text-text-dim uppercase">Approved Discount {loan.discountPercentage ? `(${loan.discountPercentage.toFixed(1)}%)` : ''}</span>
                            <span className="text-xs font-black text-red-400">- {formatINR(loan.discountAmount)}</span>
                          </div>
                        )}

                        {(() => {
                          const allStandardAtts = machine?.attachments?.filter(a => a.isStandard) || [];
                          const removedStandardAtts = allStandardAtts.filter(sa =>
                            !loan.selectedAttachments?.find(la => la.name === `${sa.type} - ${sa.config}`)
                          );

                          if (removedStandardAtts.length > 0) {
                            return (
                              <div className="pb-2 border-b border-border-main/30 space-y-1.5">
                                <span className="text-[10px] font-bold text-text-dim uppercase">Removed Standard Mods</span>
                                {removedStandardAtts.map((att, i) => (
                                  <div key={i} className="flex justify-between items-center pl-2">
                                    <span className="text-[9px] font-bold text-text-dim uppercase tracking-wide flex items-center gap-1.5">
                                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                                      {att.type} - {att.config}
                                    </span>
                                    <span className="text-[10px] font-black text-red-400">
                                      - {formatINR(att.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {loan.selectedAttachments?.filter(att => !att.isStandard).length > 0 && (
                          <div className="pb-2 border-b border-border-main/30 space-y-1.5">
                            <span className="text-[10px] font-bold text-text-dim uppercase">Attachments & Mods</span>
                            {loan.selectedAttachments.filter(att => !att.isStandard).map((att, i) => (
                              <div key={i} className="flex justify-between items-center pl-2">
                                <span className="text-[9px] font-bold text-text-dim uppercase tracking-wide flex items-center gap-1.5">
                                  <div className="w-1 h-1 bg-[#3fb950] rounded-full"></div>
                                  {att.name}
                                </span>
                                <span className="text-[10px] font-black text-text-main">
                                  + {formatINR(att.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {loan.manualCharges?.length > 0 && (
                          <div className="pb-2 border-b border-border-main/30 space-y-1.5">
                            <span className="text-[10px] font-bold text-text-dim uppercase">Additional Charges</span>
                            {loan.manualCharges.map((charge, i) => (
                              <div key={i} className="flex justify-between items-center pl-2">
                                <span className="text-[9px] font-bold text-text-dim uppercase tracking-wide flex items-center gap-1.5">
                                  <div className="w-1 h-1 bg-[#58a6ff] rounded-full"></div>
                                  {charge.name}
                                </span>
                                <span className="text-[10px] font-black text-text-main">+ {formatINR(charge.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[10px] font-black text-[#f0883e] uppercase">Total Financed Principal</span>
                          <span className="text-sm font-black text-[#f0883e]">{formatINR(loan.principal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="border-b border-border-main">
                        <th className="bg-bg-card px-8 py-4 text-[9px] font-bold text-text-dim uppercase tracking-widest">No.</th>
                        <th className="bg-bg-card px-4 py-4 text-[9px] font-bold text-text-dim uppercase tracking-widest">Due Date</th>
                        <th className="bg-bg-card px-4 py-4 text-[9px] font-bold text-text-dim uppercase tracking-widest">Principal</th>
                        <th className="bg-bg-card px-4 py-4 text-[9px] font-bold text-text-dim uppercase tracking-widest">Interest</th>
                        <th className="bg-bg-card px-4 py-4 text-[9px] font-bold text-text-dim uppercase tracking-widest">EMI</th>
                        <th className="bg-bg-card px-8 py-4 text-[9px] font-bold text-text-dim uppercase tracking-widest text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/50">
                      {!loan.schedule || loan.schedule.length === 0 ? <tr><td colSpan={6} className="px-8 py-8 text-center text-text-dim text-[10px] font-bold uppercase tracking-widest">No schedule data available</td></tr> : loan.schedule.map(s => (
                        <tr key={s.installment} className="hover:bg-bg-active transition-colors">
                          <td className="px-8 py-3 font-mono text-[10px] font-black text-text-main">#{s.installment}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-text-main">{s.dueDate}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-text-main">{formatINR(s.principal)}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-[#f0883e]">{formatINR(s.interest)}</td>
                          <td className="px-4 py-3 font-mono text-[10px] font-black text-text-main">{formatINR(s.emi)}</td>
                          <td className="px-8 py-3 font-mono text-[10px] text-text-dim text-right">{formatINR(s.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 min-h-0 order-3">
              {viewStage === 1 && activeFlow && (
                <div className="border border-border-main rounded-2xl overflow-hidden animate-fade-in shadow-xl bg-bg-deep">
                  <div className="bg-bg-card p-4 border-b border-border-main">
                    <h4 className="text-[10px] font-black text-text-dim uppercase tracking-wider flex items-center gap-2">
                      <ListOrdered size={12} className="text-primary animate-pulse" /> Asset Approval Sequence
                    </h4>
                  </div>
                  <div className="p-5 space-y-3">
                    {activeFlow.steps.map((step, idx) => {
                      const stepStatus = step.statusId || {};
                      const stepApprover = step.approverId || {};
                      const isCompleted = idx < currentStepIndex || currentStage > 1 || loan.approvalStatus === 'Rejected';
                      const isActiveStep = idx === currentStepIndex && loan.approvalStatus !== 'Rejected' && currentStage === 1;
                      const historyMatch = loan.approvalHistory?.find(h => (h.approverId?._id || h.approverId)?.toString() === (stepApprover._id || stepApprover)?.toString() && h.status === (stepStatus.name || stepStatus));

                      return (
                        <div key={idx} className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${isActiveStep ? 'bg-primary/5 border-primary/40 shadow-lg shadow-primary/5' : isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/10 border-transparent opacity-60'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black shrink-0 ${isCompleted ? 'bg-emerald-500 text-white' : isActiveStep ? 'bg-primary text-white animate-pulse shadow-[0_0_8px_var(--color-primary)]' : 'bg-slate-800 text-slate-500'}`}>
                            {isCompleted ? <Check size={10} /> : step.sequence}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-text-main uppercase">{getStepApproverName(step)}</p>
                              {isCompleted && <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Completed</span>}
                              {isActiveStep && <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded animate-pulse">Awaiting Decision</span>}
                            </div>
                            <p className="text-[9px] text-text-dim mt-0.5 uppercase tracking-wide">Transitions status to: <span style={{ color: stepStatus.color || '#f0883e' }} className="font-black">{stepStatus.name || stepStatus || '—'}</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const activeApproverId = getTicketActiveApproverId(loan);
                    const isCurrentUserApprover = user?._id?.toString() === activeApproverId;
                    if (!isCurrentUserApprover) return null;
                    return (
                      <div className="bg-bg-deep border-t border-border-main p-5 space-y-4 shadow-xl">
                        <p className="text-[10px] font-black text-primary uppercase tracking-wider">Awaiting your approval protocol</p>
                        <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="Add comments..." rows={2} className="w-full bg-bg-card border border-border-main rounded-xl px-4 py-2.5 text-xs font-bold text-text-main focus:border-[#f0883e] outline-none resize-none" />
                        <div className="flex gap-3">
                          <button onClick={() => handleApproveAction('Rejected')} className="flex-1 py-2.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Reject Asset</button>
                          <button onClick={() => handleApproveAction('Approved')} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20">Approve & Advance</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {viewStage === 2 && (
                <div className="border border-border-main rounded-2xl overflow-hidden animate-fade-in shadow-xl bg-bg-deep">
                  <div className="bg-bg-card p-4 border-b border-border-main flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-text-dim uppercase tracking-wider flex items-center gap-2"><CalendarCheck size={12} className="text-primary" /> Agreement Generation & Scheduling</h4>
                    {currentStage > 2 && <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1"><Check size={10} /> Completed</span>}
                  </div>
                  <div className="p-5 space-y-6">
                    {currentStage > 2 ? (() => {
                      const agreementUploadHistory = loan.approvalHistory?.find(h => h.action === 'Agreement Uploaded');
                      return (
                        <div className="space-y-4">
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col gap-3">
                            <div>
                              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Signed Agreement Uploaded</p>
                              {agreementUploadHistory && (
                                <div className="text-[10px] text-text-dim flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-bold text-text-main">{agreementUploadHistory.approverName}</span>
                                  <span className="opacity-50">•</span>
                                  <span className="truncate">{agreementUploadHistory.notes}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col xl:flex-row gap-2 w-full mt-1">
                              <button onClick={() => window.open(`${state.apiUrl.replace('/api', '')}${loan.agreementUrl}`, '_blank')} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-colors">
                                <Eye size={14} /> View
                              </button>
                              <button onClick={handleDownloadSigned} className="flex-1 py-2 bg-bg-card hover:bg-bg-active border border-emerald-500/30 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-colors">
                                <Download size={14} /> Download
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })() : (
                      <>
                        <div className="flex flex-col gap-3">
                          <button onClick={handleDownload} className="w-full py-3 px-4 bg-bg-card hover:bg-bg-active border border-border-main rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider text-text-main transition-colors shadow-sm">
                            <Download size={16} className="text-primary shrink-0" />
                            <span>Download Agreement</span>
                          </button>
                          <button onClick={handleSendEmail} className="w-full py-3 px-4 bg-bg-card hover:bg-bg-active border border-border-main rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider text-text-main transition-colors shadow-sm">
                            <Mail size={16} className="text-primary shrink-0" />
                            <span>Send to Customer</span>
                          </button>
                        </div>

                        {hasPermission(user, 'financing_scheduling', 'approve') ? (
                          <div className="border-t border-border-main pt-6">
                            <p className="text-xs text-text-dim mb-4">Once the customer has signed the agreement, upload the finalized document here to advance to the Invoicing Stage.</p>
                            <div className="flex flex-col gap-4">
                              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border-main rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                                <div className="flex flex-col items-center">
                                  <Upload size={20} className={selectedFile ? 'text-primary' : 'text-text-dim'} />
                                  <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-text-main">
                                    {selectedFile ? selectedFile.name : 'Select Signed PDF'}
                                  </span>
                                </div>
                                <input type="file" className="hidden" accept=".pdf" onChange={e => setSelectedFile(e.target.files[0])} />
                              </label>
                              <button
                                onClick={handleUploadAgreement}
                                disabled={!selectedFile}
                                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 ${selectedFile ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20' : 'bg-bg-active text-text-dim cursor-not-allowed border border-border-main'}`}
                              >
                                <CheckCircle size={16} /> Upload & Confirm Agreement
                              </button>
                            </div>
                          </div>
                        ) : <div className="p-4 bg-bg-card border border-red-500/20 rounded-xl flex items-start gap-3"><AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-red-500">Permission Denied to Upload Agreement</p></div></div>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {viewStage === 3 && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="border border-border-main rounded-2xl overflow-hidden shadow-xl bg-bg-deep">
                    <div className="bg-bg-card p-4 border-b border-border-main"><h4 className="text-[10px] font-black text-text-dim uppercase tracking-wider flex items-center gap-2"><FileCheck size={12} className="text-primary" /> Invoice Stage</h4></div>
                    <div className="p-5 space-y-4">
                      <p className="text-xs text-text-dim">Signed Agreement Confirmed. Please upload the final generated invoice.</p>
                      {hasPermission(user, 'financing_invoicing', 'approve') ? (
                        <div className="flex flex-col gap-4 mt-2">
                          <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border-main rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                            <div className="flex flex-col items-center">
                              <Upload size={20} className={selectedFile ? 'text-primary' : 'text-text-dim'} />
                              <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-text-main">
                                {selectedFile ? selectedFile.name : 'Select Invoice PDF'}
                              </span>
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={e => setSelectedFile(e.target.files[0])} />
                          </label>
                          <button
                            onClick={handleUploadInvoice}
                            disabled={!selectedFile}
                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 ${selectedFile ? 'bg-[#f0883e] hover:bg-[#ffab70] text-black shadow-[#f0883e]/20' : 'bg-bg-active text-text-dim cursor-not-allowed border border-border-main'}`}
                          >
                            <FileText size={16} /> Upload & Approve Invoice
                          </button>
                        </div>
                      ) : <div className="p-4 bg-bg-card border border-red-500/20 rounded-xl flex items-start gap-3"><AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-red-500">Permission Denied to Invoice</p></div></div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinancingPipeline = () => {
  const { loans, machines, customers, employees, approvalFlows } = state.data;
  const pendingLoans = loans.filter(l =>
    !['Approved', 'Rejected', 'Active'].includes(l.approvalStatus) ||
    (l.approvalStatus === 'Approved' && !l.agreementGenerated)
  );

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const getTicketActiveApproverId = (l) => {
    if (!l || ['Approved', 'Rejected'].includes(l.approvalStatus)) return null;

    let flow = null;
    if (l.approvalFlowId) {
      flow = approvalFlows.find(f => f._id?.toString() === (l.approvalFlowId._id || l.approvalFlowId).toString());
    }
    if (!flow) return null;

    const stepIdx = l.approvalStep || 0;
    if (stepIdx >= flow.steps.length) return null;

    const activeStep = flow.steps[stepIdx];
    if (!activeStep) return null;

    return (activeStep.approverId?._id || activeStep.approverId)?.toString() || null;
  };

  const getNextApproverName = (l) => {
    const activeApproverId = getTicketActiveApproverId(l);
    if (!activeApproverId) return '—';
    const emp = employees.find(e => e._id === activeApproverId);
    return emp ? emp.name : '—';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending Approval': return '#f85149';
      case 'Pending Signature': return '#ffa657';
      case 'Agreement Confirmed': return '#d2a8ff';
      case 'Invoice Uploaded': return '#3b82f6';
      case 'Approved': return '#3fb950';
      case 'Rejected': return '#768390';
      default: return '#f0883e';
    }
  };

  const getLoanStageName = (status) => {
    if (['Pending Scheduling', 'Pending Signature', 'Agreement Confirmed'].includes(status)) return 'Scheduling';
    if (['Pending Invoice', 'Invoice Uploaded'].includes(status)) return 'Invoicing';
    if (['Active'].includes(status)) return 'Completed';
    return 'Approval';
  };

  const getApproversTooltip = (l) => {
    if (getLoanStageName(l.approvalStatus) !== 'Approval') return undefined;
    if (!l.approvalHistory || l.approvalHistory.length === 0) return 'Awaiting initial approval';
    
    const approvers = l.approvalHistory
      .filter(h => h.action === 'Approved' || h.status === 'Approved')
      .map(h => h.approverName);
      
    if (approvers.length === 0) return 'Awaiting initial approval';
    return `Approved by:\n${approvers.join('\n')}`;
  };

  const filteredLoans = pendingLoans.filter(l => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Pending Approval') return l.approvalStatus === 'Pending Approval';
    if (filterStatus === 'Pending Scheduling') return l.approvalStatus === 'Pending Scheduling' || l.approvalStatus === 'Pending Signature' || l.approvalStatus === 'Agreement Confirmed';
    if (filterStatus === 'Pending Invoice') return l.approvalStatus === 'Pending Invoice' || l.approvalStatus === 'Invoice Uploaded';
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedData = filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (selectedLoan) {
    return <FinancingFormModal loan={selectedLoan} onClose={() => setSelectedLoan(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in h-full overflow-hidden flex flex-col min-h-0">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight uppercase italic">
            Financing Pipeline
          </h2>
          <p className="text-[0.625rem] font-bold text-text-dim uppercase tracking-[0.2em] mt-1">
            Manage Pending Asset Approvals & Agreements
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 custom-scrollbar">
          {['All', 'Pending Approval', 'Pending Scheduling', 'Pending Invoice'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterStatus === status ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(240,136,62,0.3)]' : 'bg-bg-card border-border-main text-text-dim hover:text-text-main hover:border-primary/50'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-bg-card border border-border-main rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left relative">
            <thead className="sticky top-0 z-[40] bg-bg-active shadow-sm">
              <tr className="border-b border-border-main">
                {['Machine', 'Client', 'Principal', 'EMI', 'Stage', 'Current Status', 'Next Approver'].map(h => (
                  <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-active">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/50">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-[10px] font-bold text-text-dim/60 uppercase tracking-widest">No pending financing requests</td></tr>
              ) : paginatedData.map((l, i) => {
                const machine = machines.find(m => m.name === l.machineName);
                const customer = customers.find(c => c._id === l.customerId || c._id === l.customerId?._id);

                return (
                  <tr key={l._id || i} onClick={() => setSelectedLoan(l)} className="hover:bg-bg-active transition-colors group cursor-pointer">
                    <td className="px-5 py-4">
                      <p className="font-black text-text-main text-xs uppercase">{l.machineName}</p>
                      <p className="text-[8px] font-mono text-text-dim/60">{l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB') : '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-text-main font-bold">{customer?.name || 'Unknown Client'}</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-text-main text-xs">
                      {formatINR(l.principal)}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-text-main text-xs">
                      {formatINR(l.emi)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        {getLoanStageName(l.approvalStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative group inline-block">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${getLoanStageName(l.approvalStatus) === 'Approval' ? 'cursor-help underline decoration-dashed underline-offset-4' : ''}`}
                          style={{ background: `${getStatusColor(l.approvalStatus)}15`, color: getStatusColor(l.approvalStatus), borderColor: `${getStatusColor(l.approvalStatus)}30`, textDecorationColor: getLoanStageName(l.approvalStatus) === 'Approval' ? `${getStatusColor(l.approvalStatus)}80` : undefined }}>
                          {l.approvalStatus}
                        </span>
                        
                        {getLoanStageName(l.approvalStatus) === 'Approval' && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-bg-card border border-border-main rounded-xl p-3 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] pointer-events-none">
                            {(() => {
                              if (!l.approvalHistory || l.approvalHistory.length === 0) {
                                return <p className="text-[9px] text-text-dim text-center uppercase tracking-widest font-bold">Awaiting initial approval</p>;
                              }
                              const approvers = l.approvalHistory.filter(h => h.action === 'Approved' || h.status === 'Approved').map(h => h.approverName);
                              if (approvers.length === 0) {
                                return <p className="text-[9px] text-text-dim text-center uppercase tracking-widest font-bold">Awaiting initial approval</p>;
                              }
                              return (
                                <div className="flex flex-col gap-2">
                                  <p className="text-[8px] font-bold text-text-dim uppercase tracking-widest border-b border-border-main/50 pb-1.5">Approved By</p>
                                  <div className="space-y-1.5">
                                    {approvers.map((a, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-[10px] font-bold text-text-main truncate">{a}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border-main"></div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bg-card -mt-[1px]"></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-text-dim text-xs">
                      {getNextApproverName(l)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-bg-card border-t border-border-main p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
              Showing <span className="text-text-main">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredLoans.length)}</span> of <span className="text-[#f0883e]">{filteredLoans.length}</span> Requests
            </p>
            <div className="flex items-center gap-2 border-l border-border-main pl-4">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-bg-deep border border-border-main rounded-lg text-[9px] font-black text-text-main px-2 py-1 outline-none focus:border-[#f0883e]"
              >
                {[5, 10, 25, 50].map(v => <option key={v} value={v}>{v} / Page</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 bg-bg-deep border border-border-main rounded-lg text-text-dim hover:text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-[#f0883e] text-black shadow-lg shadow-orange-500/20' : 'bg-bg-deep border border-border-main text-text-dim hover:text-text-main'}`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-text-dim/50">...</span>;
                }
                return null;
              })}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 bg-bg-deep border border-border-main rounded-lg text-text-dim hover:text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancingPipeline;
