import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import { showNotification, calculateFinanceNorms, calculateUpfrontFinancing, formatINR, hasPermission } from '../utils';
import {
  LayoutGrid,
  List,
  PieChart,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  History,
  Calculator,
  ChevronDown,
  Zap,
  ShieldCheck,
  Plus,
  Check,
  X
} from 'lucide-react';
import { generateSchedule } from '../logic/emi';

const getMachineImage = (m) => {
  if (!m) return 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=300';
  return (m.images && m.images.length > 0 ? m.images[0] : m.img) || 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=300';
};

const LoanAssignment = () => {
  const { loans, machines, customers, view, loanListView, user } = state.data;

  React.useEffect(() => {
    if (state?.data?.machines?.length === 0 && state.ensureMachinesLight) {
      state.ensureMachinesLight();
    }
  }, [state?.data?.machines?.length]);

  const activeTab = view === 'new-financing' ? 'new' : 'portfolio';

  const handleToggleView = (v) => {
    state.setState({ loanListView: v });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight uppercase italic">
            {activeTab === 'new' ? 'New Financing' : 'Financed Assets'}
          </h2>
          <p className="text-[0.625rem] font-bold text-text-dim uppercase tracking-[0.2em] mt-1">
            {activeTab === 'new' ? 'Assign Asset to Client' : 'Financed Asset Management'}
          </p>
        </div>

        {activeTab !== 'new' && (
          <div className="flex items-center gap-6">
            <div className="glass-tabs">
              <div className="tab-indicator" style={{
                left: (loanListView || 'card') === 'card' ? '0px' : '50%',
                width: '50%'
              }}></div>
              <button
                className={`glass-tab ${(loanListView || 'card') === 'card' ? 'active' : ''}`}
                onClick={() => handleToggleView('card')}
              >
                <LayoutGrid size={14} className="mr-2" /> Cards
              </button>
              <button
                className={`glass-tab ${(loanListView || 'card') === 'list' ? 'active' : ''}`}
                onClick={() => handleToggleView('list')}
              >
                <List size={14} className="mr-2" /> List
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'portfolio' ? (
        (loanListView || 'card') === 'card' ? <PortfolioCardView loans={loans} machines={machines} user={user} /> : <PortfolioListView loans={loans} machines={machines} user={user} />
      ) : (
        <NewAssignment machines={machines} customers={customers} user={user} />
      )}
    </div>
  );
};

const PortfolioCardView = ({ loans, machines, user }) => {
  const pendingLoans = loans.filter(l => {
    if (l.approvalStatus !== 'Active') return false;
    const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
    return paidCount < l.schedule.length;
  });

  const paidLoans = loans.filter(l => {
    if (l.approvalStatus !== 'Active') return false;
    const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
    return paidCount === l.schedule.length && l.schedule.length > 0;
  });

  const renderLoanCard = (l) => {
    const machine = machines.find(m => m.name === l.machineName);
    const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
    const pendingCount = l.schedule.filter(s => s.status === 'Pending').length;
    const progress = (paidCount / (l.schedule.length || 1)) * 100;

    return (
      <div key={l._id} className="glass-card !p-0 overflow-hidden flex flex-col group hover:border-[#f0883e]/30 transition-all">
        <div className="relative h-24 bg-black overflow-hidden">
          <img src={getMachineImage(machine)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
          <div className="absolute bottom-2 left-3">
            <h3 className="font-black text-[0.625rem] truncate w-[140px]" style={{ color: '#f8fafc' }}>{l.machineName}</h3>
            <p className="text-[0.4375rem] font-black text-[#f0883e] uppercase tracking-widest mt-0.5">ID: {l._id.substring(l._id.length - 4)}</p>
          </div>
        </div>
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-bg-active">
              <p className="text-[0.4375rem] font-black text-text-dim uppercase tracking-widest">Principal</p>
              <p className="text-[0.625rem] font-black text-text-main">₹{(l.principal / 100000).toFixed(1)}L</p>
            </div>
            <div className="p-2 rounded-xl bg-[#f0883e]/5 border border-[#f0883e]/10">
              <p className="text-[0.4375rem] font-black text-[#f0883e] uppercase tracking-widest">Monthly EMI</p>
              <p className="text-[0.625rem] font-black text-text-main">₹{(l.emi / 1000).toFixed(0)}k</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-bg-deep/45 rounded-xl p-2 border border-border-main/50 text-[10px]">
            <div>
              <p className="text-[0.4375rem] font-black text-[#3fb950] uppercase tracking-widest">Paid EMIs</p>
              <p className="text-[0.625rem] font-bold text-text-main">{paidCount} / {l.schedule.length}</p>
            </div>
            <div>
              <p className="text-[0.4375rem] font-black text-[#f0883e] uppercase tracking-widest">Pending EMIs</p>
              <p className="text-[0.625rem] font-bold text-text-main">{pendingCount}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[0.4375rem] font-black uppercase tracking-widest">
              <span className="text-text-dim">{Math.round(progress)}% PAID</span>
              <span className={pendingCount === 0 ? "text-[#3fb950]" : "text-[#f0883e]"}>
                {pendingCount === 0 ? "COMPLETED" : "ACTIVE"}
              </span>
            </div>
            <div className="w-full h-1 bg-bg-active rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#f0883e] to-yellow-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-main">
            <div className="text-[0.5rem] font-black text-text-dim uppercase truncate max-w-[100px]">
              {l.customerId?.name || 'Unknown'}
            </div>
            {l.approvalStatus === 'Pending Approval' ? (
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <History size={10} /> Pending Approval
                </span>
                {l.approvalFlowId?.steps?.[l.approvalStep]?.approverId === user?._id && (
                  <button
                    onClick={async () => {
                      const res = await state.approveLoan(l._id);
                      if (res.success) {
                        showNotification('Asset financing approved!');
                      } else {
                        showNotification(res.message || 'Approval failed', 'error');
                      }
                    }}
                    className="px-2 py-1 bg-primary text-black text-[9px] rounded font-black uppercase hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/20"
                  >
                    Approve
                  </button>
                )}
              </div>
            ) : (
              <button onClick={() => state.setState({ selectedLoanId: l._id, view: 'loan-details', previousView: 'loans' })} className="w-7 h-7 bg-[#f0883e] text-black rounded-lg flex items-center justify-center transition-all hover:scale-110 cursor-pointer">
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Active/Pending Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-main pb-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Active Loans ({pendingLoans.length})</h3>
        </div>
        {pendingLoans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pendingLoans.map(renderLoanCard)}
          </div>
        ) : (
          <div className="py-8 text-center glass-card border-dashed border-border-main">
            <p className="text-text-dim font-black uppercase tracking-widest text-[0.625rem]">No active financing plans.</p>
          </div>
        )}
      </div>

      {/* Completed/Paid Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-border-main pb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Fully Paid ({paidLoans.length})</h3>
        </div>
        {paidLoans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paidLoans.map(renderLoanCard)}
          </div>
        ) : (
          <div className="py-8 text-center glass-card border-dashed border-border-main">
            <p className="text-text-dim font-black uppercase tracking-widest text-[0.625rem]">No fully settled plans.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PortfolioListView = ({ loans, machines, user }) => {
  const pendingLoans = loans.filter(l => {
    if (l.approvalStatus !== 'Active') return false;
    const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
    return paidCount < l.schedule.length;
  });

  const paidLoans = loans.filter(l => {
    if (l.approvalStatus !== 'Active') return false;
    const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
    return paidCount === l.schedule.length && l.schedule.length > 0;
  });

  const renderTable = (list, title, colorClass) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border-main pb-2">
        <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
        <h3 className="text-xs font-black text-text-main uppercase tracking-widest">{title} ({list.length})</h3>
      </div>
      {list.length > 0 ? (
        <div className="glass-card !p-0 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left compact-table">
              <thead>
                <tr className="bg-bg-active">
                  <th className="px-4 py-3">Asset Details</th>
                  <th className="px-4 py-3">Party Name</th>
                  <th className="px-4 py-3">Principal</th>
                  <th className="px-4 py-3">EMI</th>
                  <th className="px-4 py-3">Paid EMIs</th>
                  <th className="px-4 py-3">Pending EMIs</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(l => {
                  const machine = machines.find(m => m.name === l.machineName);
                  const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
                  const pendingCount = l.schedule.filter(s => s.status === 'Pending').length;
                  const progress = (paidCount / (l.schedule.length || 1)) * 100;
                  return (
                    <tr key={l._id} className="hover:bg-bg-active transition-all group">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-deep border border-border-main">
                            <img src={getMachineImage(machine)} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                          </div>
                          <div>
                            <div className="font-black text-text-main text-[0.6875rem] truncate max-w-[150px]">{l.machineName}</div>
                            <div className="text-[0.5rem] font-black text-[#f0883e] uppercase tracking-widest">{l._id.substring(l._id.length - 6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-black text-text-main text-[0.625rem]">{l.customerId?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-4 py-2 font-black text-text-dim text-[0.625rem]">₹{(l.principal / 100000).toFixed(1)}L</td>
                      <td className="px-4 py-2 font-black text-[#f0883e] text-[0.625rem]">₹{(l.emi / 1000).toFixed(1)}k</td>
                      <td className="px-4 py-2 font-black text-[#3fb950] text-[0.625rem]">{paidCount} / {l.schedule.length}</td>
                      <td className="px-4 py-2 font-black text-[#f0883e] text-[0.625rem]">{pendingCount}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <div className="w-full h-1 bg-bg-active rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#f0883e] to-yellow-300" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-[0.4375rem] font-black text-text-dim uppercase">{Math.round(progress)}% PAID</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {l.approvalStatus === 'Pending Approval' ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                              <History size={10} /> Pending
                            </span>
                            {l.approvalFlowId?.steps?.[l.approvalStep]?.approverId === user?._id && (
                              <button
                                onClick={async () => {
                                  const res = await state.approveLoan(l._id);
                                  if (res.success) {
                                    showNotification('Asset financing approved!');
                                  } else {
                                    showNotification(res.message || 'Approval failed', 'error');
                                  }
                                }}
                                className="px-3 py-1 bg-primary text-black text-[10px] rounded-lg font-black uppercase hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/20"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => state.setState({ selectedLoanId: l._id, view: 'loan-details', previousView: 'loans' })} className="w-7 h-7 bg-[#f0883e] text-black rounded-lg inline-flex items-center justify-center transition-all hover:scale-110 cursor-pointer">
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center glass-card border-dashed border-border-main">
          <p className="text-text-dim font-black uppercase tracking-widest text-[0.625rem]">No plans in this category.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {renderTable(pendingLoans, "Active Loans", "bg-amber-500 animate-pulse")}
      {renderTable(paidLoans, "Fully Paid", "bg-emerald-500")}
    </div>
  );
};

const NewAssignment = ({ machines, customers, user }) => {
  const [formData, setFormData] = useState({
    financingType: 'EMI',
    customerId: '',
    machineName: '',
    emiStartDate: new Date().toISOString().split('T')[0],
    tenure: 3,
    machinePrice: 0,
    discountPercentage: 0,
    discountAmount: 0,
    downPayment: 0,
    downPaymentInstallments: 1,
    interestRate: 12,
    marginInterestRate: 0,
    delayInterest: 24, // Overdue/Delay interest default
    compoundOverdueInterest: false,
    selectedAttachments: [],
    manualCharges: []
  });

  const isMachineSelected = !!formData.machineName;
  const selectedMachineModel = machines.find(m => m.name === formData.machineName);
  const availableAttachments = selectedMachineModel?.attachments || [];

  let attachmentTotal = 0;
  availableAttachments.forEach(att => {
    const attName = `${att.type} - ${att.config}`;
    const isSelected = formData.selectedAttachments.some(sa => sa.name === attName);

    if (att.isStandard) {
      if (!isSelected) {
        attachmentTotal -= (parseFloat(att.amount) || 0);
      }
    } else {
      if (isSelected) {
        attachmentTotal += (parseFloat(att.amount) || 0);
      }
    }
  });

  const manualChargesTotal = formData.manualCharges.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const finalPrice = Math.max(0, formData.machinePrice - formData.discountAmount);
  const baseMachinePrice = Math.max(0, finalPrice + attachmentTotal + manualChargesTotal);
  const norms = calculateUpfrontFinancing(baseMachinePrice, parseFloat(formData.interestRate) || 0, parseInt(formData.tenure) || 0, parseFloat(formData.downPayment) || 0);
  const P = norms.financedAmount;

  const calculateEndDate = () => {
    if (!formData.emiStartDate || !formData.tenure) return 'N/A';
    const startDate = new Date(formData.emiStartDate);
    startDate.setMonth(startDate.getMonth() + parseInt(formData.tenure));
    return startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Generate Schedule on the fly for display
  const schedule = generateSchedule(
    norms.invoiceValue || 0, // generateSchedule uses principal - downPayment = financedAmount
    parseFloat(formData.interestRate) || 0,
    (parseInt(formData.tenure) || 0) / 12, // logic/emi expects years
    'flat_upfront',
    formData.emiStartDate ? new Date(formData.emiStartDate) : new Date(),
    parseFloat(formData.downPayment) || 0,
    parseInt(formData.downPaymentInstallments) || 0,
    parseFloat(formData.marginInterestRate) || 0
  );
  
  // Actually logic/emi.js calculates years. Let's adjust it. 
  // Wait, let's fix generateSchedule call. I will just pass years = tenure / 12.


  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.customerId) {
      showNotification('Error: Please select a client', 'error');
      return;
    }
    if (!formData.machineName) {
      showNotification('Error: Please select an asset', 'error');
      return;
    }
    if (!formData.emiStartDate) {
      showNotification('Error: EMI Start Date is required', 'error');
      return;
    }

    if (P <= 0 || norms.emi <= 0) {
      showNotification('Error: Invalid financial details', 'error');
      return;
    }

    const newLoan = {
      ...formData,
      principal: P,
      emi: norms.emi,
      status: 'Active',
      schedule
    };

    const result = await state.addLoan(newLoan);
    if (result.success) {
      showNotification('Financing plan submitted successfully!');
      if (result.data && result.data.approvalStatus !== 'Approved') {
        state.setState({ view: 'financing-pipeline' });
      } else {
        state.setState({ view: 'financed-machines' });
      }
    } else {
      showNotification(`Failed: ${result.message}`, 'error');
    }
  };

  const attachmentOptions = ["None", ...availableAttachments.map(a => `${a.type} - ${a.config} (₹${a.amount})`)];

  return (
    <div className="flex-1 grid grid-cols-12 gap-8 min-h-[calc(100vh-180px)] h-[calc(100vh-180px)] mt-4">

      {/* LEFT COLUMN: FINANCIAL PARAMETERS */}
      <div className="col-span-12 lg:col-span-5 bg-bg-card border border-border-main rounded-2xl relative overflow-hidden flex flex-col shadow-2xl">
        {/* GitHub Style Vertical Progress Line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-border-main" />

        <div className="p-8 space-y-8 relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#f0883e] text-black rounded-full flex items-center justify-center font-black text-xs shadow-[0_0_15px_rgba(240,136,62,0.3)]">1</div>
              <h2 className="text-sm font-bold text-text-main uppercase tracking-[0.2em]">Financing Details</h2>
            </div>
            <div className="flex bg-bg-deep rounded-lg p-1 border border-border-main">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, financingType: 'EMI', customerId: '' })}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${formData.financingType === 'EMI' ? 'bg-[#f0883e] text-black shadow-md' : 'text-text-dim hover:text-text-main'}`}
              >
                EMI
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, financingType: 'Rental', customerId: '' })}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${formData.financingType === 'Rental' ? 'bg-[#f0883e] text-black shadow-md' : 'text-text-dim hover:text-text-main'}`}
              >
                Rental
              </button>
            </div>
          </div>

          <div className="pl-12 space-y-6 flex-1 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-6">
              <SearchableDropdown
                label="Client"
                selected={customers.find(c => c._id === formData.customerId)?.name || "Select Client..."}
                onSelect={(val) => setFormData({ ...formData, customerId: customers.find(c => c.name === val)?._id })}
                options={customers.filter(c => (Array.isArray(c.type) ? c.type.includes(formData.financingType || 'EMI') : (Array.isArray(c.type) ? c.type.includes(formData.financingType || 'EMI') : c.type === (formData.financingType || 'EMI')))).map(c => c.name)}
              />
              <SearchableDropdown
                label="Equipment Model"
                selected={formData.machineName || "Select Asset..."}
                onSelect={(val) => {
                  const sm = machines.find(m => m.name === val);
                  const standardAtts = (sm?.attachments || []).filter(a => a.isStandard).map(a => ({ name: `${a.type} - ${a.config}`, amount: a.amount, isStandard: true }));
                  setFormData({
                    ...formData,
                    machineName: val,
                    machinePrice: sm?.pricing?.totalPrice || 0,
                    discountPercentage: 0,
                    discountAmount: 0,
                    selectedAttachments: standardAtts
                  });
                }}
                options={machines.map(m => m.name)}
              />
            </div>

            {isMachineSelected && availableAttachments.length > 0 && (
              <div className="space-y-3 bg-[#0d1117] border border-[#30363d] rounded-xl p-5 shadow-inner">
                <p className="text-[10px] font-bold text-[#768390] uppercase tracking-wider flex items-center justify-between">
                  <span>Configure Attachments</span>
                  <span className="text-[#f0883e] font-mono">Total: ₹{attachmentTotal.toLocaleString()}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableAttachments.map((att, idx) => {
                    const attName = `${att.type} - ${att.config}`;
                    const isSelected = formData.selectedAttachments.some(sa => sa.name === attName);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({ ...formData, selectedAttachments: formData.selectedAttachments.filter(sa => sa.name !== attName) });
                          } else {
                            setFormData({ ...formData, selectedAttachments: [...formData.selectedAttachments, { name: attName, amount: att.amount, isStandard: att.isStandard }] });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-[#f0883e]/10 border-[#f0883e]/50 text-[#f0883e]' : 'bg-[#161b22] border-[#30363d] text-[#768390] hover:text-white hover:border-[#444c56]'}`}
                      >
                        {attName} <span className="font-mono opacity-60 font-medium">(₹{att.amount.toLocaleString()})</span>
                        {att.isStandard && <span className="text-[8px] bg-[#30363d] px-1 py-0.5 rounded uppercase text-white tracking-widest border border-white/5">STD</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">Asset Base Price (₹)</p>
                <input
                  type="number"
                  disabled={!isMachineSelected}
                  value={formData.machinePrice}
                  onChange={e => {
                    const price = parseFloat(e.target.value) || 0;
                    const amount = (price * formData.discountPercentage) / 100;
                    setFormData({ ...formData, machinePrice: price, discountAmount: amount });
                  }}
                  className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs font-mono font-bold text-text-main focus:border-[#58a6ff] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">Discount (%)</p>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isMachineSelected}
                    value={formData.discountPercentage}
                    onChange={e => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      let perc = parseFloat(raw) || 0;
                      if (perc > 100) perc = 100;
                      const amount = (formData.machinePrice * perc) / 100;
                      setFormData({ ...formData, discountPercentage: raw && parseFloat(raw) > 100 ? '100' : raw, discountAmount: amount });
                    }}
                    className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs font-mono font-bold text-text-main focus:border-[#58a6ff] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">Discount (₹)</p>
                  <input
                    type="number"
                    disabled={!isMachineSelected}
                    value={formData.discountAmount}
                    onChange={e => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      let amount = parseFloat(raw) || 0;
                      if (amount > formData.machinePrice) amount = formData.machinePrice;
                      const perc = formData.machinePrice ? (amount / formData.machinePrice) * 100 : 0;
                      setFormData({ ...formData, discountAmount: raw && parseFloat(raw) > formData.machinePrice ? formData.machinePrice.toString() : raw, discountPercentage: perc });
                    }}
                    className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs font-mono font-bold text-text-main focus:border-[#58a6ff] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">{formData.financingType === 'Rental' ? 'Rental Start Date' : 'EMI Start Date'}</p>
                <input
                  type="date"
                  disabled={!isMachineSelected}
                  value={formData.emiStartDate}
                  onChange={e => setFormData({ ...formData, emiStartDate: e.target.value })}
                  className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs text-text-main font-bold focus:border-[#58a6ff] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">Tenure (Months)</p>
                <input
                  type="number"
                  disabled={!isMachineSelected}
                  value={formData.tenure}
                  onChange={e => setFormData({ ...formData, tenure: e.target.value.replace(/^0+(?=\d)/, '') })}
                  className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs text-text-main font-bold focus:border-[#58a6ff] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">Est. End Date</p>
                <div className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs text-text-main font-bold outline-none cursor-not-allowed opacity-70 flex items-center h-[34px]">
                  {calculateEndDate()}
                </div>
              </div>
            </div>

            <div className="bg-bg-deep/50 border border-border-main rounded-xl p-5 grid grid-cols-2 gap-8 shadow-inner">
              <div>
                <p className="text-[10px] font-bold text-text-dim mb-1 uppercase tracking-tighter">Margin Money (₹)</p>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    disabled={!isMachineSelected}
                    value={formData.downPayment}
                    onChange={e => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      const val = parseFloat(raw) || 0;
                      const finalPrice = Math.max(0, formData.machinePrice - (parseFloat(formData.discountAmount) || 0));
                      const maxDownPayment = finalPrice + attachmentTotal + manualChargesTotal;
                      setFormData({ ...formData, downPayment: raw && val > maxDownPayment ? maxDownPayment.toString() : raw });
                    }}
                    className="w-full bg-transparent text-xl font-mono font-black text-text-main focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col border-l border-border-main pl-4">
                    <p className="text-[8px] font-bold text-text-dim uppercase tracking-tighter whitespace-nowrap">DP Installments</p>
                    <input
                      type="number"
                      min="1"
                      disabled={!isMachineSelected || formData.downPayment <= 0}
                      value={formData.downPaymentInstallments}
                      onChange={e => setFormData({ ...formData, downPaymentInstallments: e.target.value.replace(/^0+(?=\d)/, '') })}
                      className="w-16 bg-transparent text-sm font-mono font-bold text-text-main focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-l border-border-main pl-8">
                <div>
                  <p className="text-[10px] font-bold text-text-dim mb-1 uppercase tracking-tighter">Finance Interest (% p.a.)</p>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isMachineSelected}
                    value={formData.interestRate}
                    onChange={e => setFormData({ ...formData, interestRate: e.target.value.replace(/^0+(?=\d)/, '') })}
                    className="w-full bg-transparent text-xl font-mono font-black text-text-main focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="border-l border-border-main pl-4">
                  <p className="text-[10px] font-bold text-text-dim mb-1 uppercase tracking-tighter">Margin Interest (% p.a.)</p>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isMachineSelected}
                    value={formData.marginInterestRate}
                    onChange={e => setFormData({ ...formData, marginInterestRate: e.target.value.replace(/^0+(?=\d)/, '') })}
                    className="w-full bg-transparent text-xl font-mono font-black text-text-main focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 items-end">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">Overdue Interest (% P.A.)</p>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isMachineSelected}
                    value={formData.delayInterest}
                    onChange={e => setFormData({ ...formData, delayInterest: e.target.value.replace(/^0+(?=\d)/, '') })}
                    className="w-full bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs font-mono font-bold text-text-main focus:border-[#58a6ff] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-[#f0883e]"
                      disabled={!isMachineSelected}
                      checked={formData.compoundOverdueInterest}
                      onChange={(e) => setFormData({ ...formData, compoundOverdueInterest: e.target.checked })}
                    />
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Compound</span>
                  </label>
                </div>
              </div>
              <div className={`flex flex-col justify-end pb-2 ${!isMachineSelected ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Manual Charges</p>
                  <div
                    onClick={() => {
                      const charges = formData.manualCharges;
                      if (charges.length > 0) {
                        const last = charges[charges.length - 1];
                        if (!last.name.trim() || last.amount === '' || last.amount < 0) {
                          showNotification('Please fill the previous charge details first.', 'error');
                          return;
                        }
                      }
                      setFormData({ ...formData, manualCharges: [...charges, { name: '', amount: 0 }] });
                    }}
                    className={`text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider transition-colors ${formData.manualCharges.length > 0 && (!formData.manualCharges[formData.manualCharges.length - 1].name.trim() || formData.manualCharges[formData.manualCharges.length - 1].amount === '' || formData.manualCharges[formData.manualCharges.length - 1].amount < 0)
                        ? 'text-text-dim cursor-not-allowed opacity-50'
                        : 'text-[#f0883e] hover:underline cursor-pointer'
                      }`}
                  >
                    <Plus size={12} /> Add Charge
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Charges List */}
            <div className={`space-y-3 ${!isMachineSelected ? 'opacity-50 pointer-events-none' : ''}`}>
              {formData.manualCharges.map((charge, index) => (
                <div key={index} className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Charge Name"
                    value={charge.name}
                    onChange={e => {
                      const newCharges = [...formData.manualCharges];
                      newCharges[index].name = e.target.value;
                      setFormData({ ...formData, manualCharges: newCharges });
                    }}
                    className="flex-1 bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs font-bold text-text-main focus:border-[#58a6ff] outline-none transition-all"
                  />
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={charge.amount}
                    onChange={e => {
                      const newCharges = [...formData.manualCharges];
                      newCharges[index].amount = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, manualCharges: newCharges });
                    }}
                    className="w-32 bg-bg-deep border border-border-main rounded-md px-3 py-2 text-xs font-mono font-bold text-text-main focus:border-[#58a6ff] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newCharges = [...formData.manualCharges];
                      newCharges.splice(index, 1);
                      setFormData({ ...formData, manualCharges: newCharges });
                    }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-border-main flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-text-dim mb-1 uppercase tracking-widest">{formData.financingType === 'Rental' ? 'Monthly Rent' : 'Monthly EMI'}</p>
                <p className="text-4xl font-mono font-black text-[#f0883e] tracking-tighter leading-none italic">{formatINR(norms.emi)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-text-dim/60 uppercase">Financed Amount</p>
                <p className="text-lg font-mono font-bold text-text-main">{formatINR(P)}</p>
              </div>
            </div>
          </div>

          {hasPermission(user, 'new_financing', 'create') ? (
            <button
              onClick={handleSubmit}
              className="w-full mt-6 py-4 bg-[#f0883e] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#ffab70] transition-all shadow-[0_10px_20px_rgba(240,136,62,0.15)] active:scale-95"
            >
              Submit Financing Request
            </button>
          ) : (
            <button
              disabled
              className="w-full mt-6 py-4 bg-bg-active text-text-dim font-black text-xs uppercase tracking-widest rounded-xl cursor-not-allowed border border-border-main"
            >
              No Permission to Submit
            </button>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SELECTION & PROJECTIONS */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 overflow-hidden">

        <h2 className="text-xs font-bold text-text-dim uppercase tracking-[0.3em] flex items-center gap-3">
          <Zap size={14} className="text-[#f0883e]" /> Select Asset & Projections
        </h2>

        {/* STATS STRIP */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="p-4 rounded-xl border border-border-main bg-bg-card space-y-2">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest border-b border-border-main pb-2">Value Breakdown</h3>
            <div className="flex justify-between text-[10px]"><span className="text-text-dim">1. Machine Price</span><span className="font-mono text-text-main">{formatINR(norms.machinePrice)}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-text-dim">2. Interest (Capitalized) @{norms.r}%</span><span className="font-mono text-[#f0883e]">{formatINR(norms.interestAmount)}</span></div>
            <div className="flex justify-between text-[10px] font-bold pt-1"><span className="text-text-main">3. Sale Price</span><span className="font-mono text-text-main">{formatINR(norms.salePrice)}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-text-dim">4. GST @18%</span><span className="font-mono text-text-main">{formatINR(norms.gst)}</span></div>
            <div className="flex justify-between text-[10px] font-bold pt-1"><span className="text-text-main">5. Sale Value</span><span className="font-mono text-text-main">{formatINR(norms.saleValue)}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-text-dim">6. TCS @0.1%</span><span className="font-mono text-text-main">{formatINR(norms.tcs)}</span></div>
            <div className="flex justify-between text-[10px] font-black pt-1 border-t border-border-main mt-1 pt-2"><span className="text-text-main">7. Invoice Value</span><span className="font-mono text-text-main">{formatINR(norms.invoiceValue)}</span></div>
          </div>
          <div className="p-4 rounded-xl border border-border-main bg-bg-card space-y-2 flex flex-col">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest border-b border-border-main pb-2">Financing Details</h3>
            <div className="flex justify-between text-[10px]"><span className="text-text-dim">8. Margin Money</span><span className="font-mono text-text-main">{formatINR(norms.marginMoney)}</span></div>
            <div className="flex justify-between text-[10px] font-black pt-1 border-t border-border-main mt-1 pt-2"><span className="text-[#f0883e]">9. Financed Amount</span><span className="font-mono text-[#f0883e]">{formatINR(norms.financedAmount)}</span></div>
            <div className="flex-1"></div>
            <div className="bg-bg-deep p-3 rounded-lg border border-border-main">
               <p className="text-[8px] font-bold text-text-dim uppercase tracking-widest mb-1">10. Monthly EMI</p>
               <p className="text-2xl font-mono font-black text-text-main">{formatINR(norms.emi)} <span className="text-[10px] font-normal text-text-dim tracking-normal">x {norms.n}</span></p>
            </div>
          </div>
        </div>

        {/* REPAYMENT SCHEDULE TABLE */}
        <div className="flex-1 overflow-hidden flex flex-col bg-bg-card border border-border-main rounded-2xl shadow-xl">
          <div className="bg-bg-active border-b border-border-main p-3">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-widest flex items-center justify-between">
              <span>Amortization Schedule</span>
              <span className="text-[#3fb950] font-black">{schedule.length} Installments</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left compact-table">
              <thead className="sticky top-0 bg-bg-card shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-widest">Installment</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-widest">Due Date</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-widest">Principal</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-widest">Interest</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-widest">EMI</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-widest text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/50">
                {schedule.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-dim text-[10px] font-bold uppercase tracking-widest">Configure parameters to view schedule</td></tr>
                ) : schedule.map((s, index) => (
                  <tr key={s.installmentNo || index} className="hover:bg-bg-active transition-colors">
                    <td className="px-4 py-2 font-mono text-[10px] font-black text-text-main">#{index + 1}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-text-main">{s.dueDate}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-text-main">{formatINR(s.principal)}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-[#f0883e]">{formatINR(s.interest)}</td>
                    <td className="px-4 py-2 font-mono text-[10px] font-black text-text-main">{formatINR(s.emi)}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-text-dim text-right">{formatINR(s.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER STATUS BAR */}
        <footer className="shrink-0 flex items-center justify-between px-2 py-3 border-t border-border-main bg-bg-deep/30 text-[9px] font-mono text-text-dim/60 uppercase tracking-widest">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck size={10} className="text-[#3fb950]" /> Secured Connection</span>
            <span>ID: LG-FIN-{new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            Sync Active
          </div>
        </footer>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, accent = false }) => (
  <div className={`p-4 rounded-xl border border-border-main bg-bg-card flex flex-col justify-between h-24 hover:border-text-dim transition-colors group ${accent ? 'border-b-2 border-b-[#f0883e]' : ''}`}>
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">{label}</span>
      <Icon size={12} className="text-text-dim/40 group-hover:text-text-dim transition-colors" />
    </div>
    <p className={`text-xl font-mono font-black tracking-tighter ${accent ? 'text-[#f0883e]' : 'text-text-main'}`}>{value}</p>
  </div>
);

const SearchableDropdown = ({ label, options, selected, onSelect, placeholder = "Select...", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(opt =>
    (opt || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className={`relative w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <p className="text-[10px] font-bold text-text-dim mb-1.5 uppercase tracking-wider">{label}</p>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 bg-bg-deep border border-border-main rounded-md text-xs text-text-main transition-all ${disabled ? 'cursor-not-allowed' : 'hover:border-text-dim'}`}
      >
        <span className="truncate">{selected || placeholder}</span>
        <ChevronDown size={14} className="text-text-dim/60 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-bg-card border border-border-main rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-border-main">
            <input
              type="text"
              placeholder="Filter..."
              className="w-full bg-bg-deep border border-border-main rounded py-1 px-2 text-[10px] text-text-main focus:outline-none focus:border-[#58a6ff]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-40 overflow-y-auto no-scrollbar">
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => { onSelect(opt); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 text-[10px] hover:bg-bg-active flex items-center justify-between group transition-colors"
              >
                <span className={selected === opt ? 'text-text-main font-bold' : 'text-text-dim'}>{opt}</span>
                {selected === opt && <Check size={10} className="text-[#3fb950]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanAssignment;
