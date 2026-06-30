import React, { useState } from 'react';
import { state } from '../state';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { hasPermission, showNotification, confirmAction } from '../utils';
import {
  Plus, Search, FileText, Calendar, Edit3, Trash2, Eye, ChevronDown,
  Building2, User, MapPin, Phone, Mail, Clock, DollarSign, Shield, X, Check
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">{label}</p>
    {children}
  </div>
);
const Input = ({ value, onChange, placeholder, type = 'text', ...props }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full bg-bg-deep border border-border-main rounded-lg px-4 py-2.5 text-sm text-text-main font-bold focus:border-[#f0883e] outline-none transition-colors"
    {...props}
  />
);
const Select = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    className="w-full bg-bg-deep border border-border-main rounded-lg px-4 py-2.5 text-sm text-text-main font-bold focus:border-[#f0883e] outline-none"
  >
    {children}
  </select>
);

// ── Contract Form Modal ────────────────────────────────────────────────────
const ContractFormModal = ({ contract, onClose }) => {
  const { customers, machines } = state.data;

  React.useEffect(() => {
    if (state?.data?.machines?.length === 0 && state.ensureMachinesLight) {
      state.ensureMachinesLight();
    }
  }, [state?.data?.machines?.length]);

  const [activeTab, setActiveTab] = useState('CUSTOMER');
  const [form, setForm] = useState(contract || {
    customerName: '', companyName: '', siteName: '', siteAddress: '',
    contactPerson: '', mobile: '', email: '', customerId: '',
    agreementNumber: `AGR-${Date.now().toString().slice(-6)}`,
    startDate: '', endDate: '', duration: '', billingCycle: 'Monthly',
    machines: [], assignedSupervisor: '', backupSupervisor: '',
    fixedMonthlyCharge: 0, hourlyRate: 0, minBillingHours: 200,
    overtimeRate: 0, breakdownCoverage: true, partsIncluded: false,
    consumablesIncluded: false, slaResponseTime: 2, slaResolutionTime: 24,
    status: 'Active'
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.customerName || !form.agreementNumber || !form.startDate) {
      showNotification('Customer, Agreement Number and Start Date are required', 'error');
      return;
    }
    const result = await state.saveFMCContract(form);
    if (result.success) {
      showNotification(contract ? 'Contract Updated' : 'FMC Contract Created', 'success');
      onClose();
    } else {
      showNotification(result.message || 'Save failed', 'error');
    }
  };

  const tabs = ['CUSTOMER', 'CONTRACT', 'MACHINES', 'BILLING', 'SLA'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-bg-card border border-border-main rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-5 border-b border-border-main flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-text-main uppercase tracking-tight">{contract ? 'Edit Contract' : 'New FMC Agreement'}</h2>
            <p className="text-[9px] font-mono text-text-dim/60 uppercase tracking-widest">FMC Contract Initialization Protocol</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-active rounded-xl transition-colors text-text-dim hover:text-text-main"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-8 pt-4 border-b border-border-main shrink-0">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-t-lg transition-all ${activeTab === t ? 'bg-[#f0883e]/10 text-[#f0883e] border-b-2 border-[#f0883e]' : 'text-text-dim/60 hover:text-text-dim'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'CUSTOMER' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#f0883e]/5 border border-[#f0883e]/20 rounded-xl">
                <Field label="Choose Existing FMC Customer">
                  <Select
                    value={form.customerId || ''}
                    onChange={e => {
                      const cust = customers.find(c => c._id === e.target.value);
                      if (cust) {
                        setForm(p => ({
                          ...p,
                          customerId: cust._id,
                          customerName: cust.name,
                          companyName: cust.name,
                          mobile: cust.mobile,
                          email: cust.email,
                          siteAddress: cust.address || '',
                        }));
                      }
                    }}
                  >
                    <option value="">-- Select Onboarded Client --</option>
                    {customers.filter(c => (Array.isArray(c.type) ? c.type.includes('FMC') : (Array.isArray(c.type) ? c.type.includes('FMC') : c.type === 'FMC'))).map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.mobile})</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer Name"><Input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="e.g. Rajesh Constructions" /></Field>
                <Field label="Company Name"><Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Registered company name" /></Field>
                <Field label="Site Name"><Input value={form.siteName} onChange={e => set('siteName', e.target.value)} placeholder="Project site name" /></Field>
                <Field label="Contact Person"><Input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="On-site contact" /></Field>
                <Field label="Mobile Number"><Input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 XXXXX XXXXX" /></Field>
                <Field label="Email Address"><Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@company.com" type="email" /></Field>
                <Field label="Site Address" ><textarea value={form.siteAddress} onChange={e => set('siteAddress', e.target.value)} placeholder="Complete site address" rows={3} className="w-full bg-bg-deep border border-border-main rounded-lg px-4 py-2.5 text-sm text-text-main font-bold focus:border-[#f0883e] outline-none col-span-2 resize-none" /></Field>
              </div>
            </div>
          )}
          {activeTab === 'CONTRACT' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agreement Number"><Input value={form.agreementNumber} onChange={e => set('agreementNumber', e.target.value)} /></Field>
              <Field label="Billing Cycle"><Select value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)}>
                <option>Monthly</option><option>Quarterly</option><option>Annual</option>
              </Select></Field>
              <Field label="Start Date"><Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></Field>
              <Field label="End Date"><Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></Field>
              <Field label="Contract Status"><Select value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Active</option><option>Draft</option><option>Expired</option><option>Terminated</option>
              </Select></Field>
              <Field label="Assigned Supervisor">
                <Select value={form.assignedSupervisor} onChange={e => set('assignedSupervisor', e.target.value)}>
                  <option value="">Select Supervisor</option>
                  {state.data.fmcSupervisors?.map(s => <option key={s._id} value={s._id}>{s.name} ({s.employeeId})</option>)}
                </Select>
              </Field>
              <Field label="Backup Supervisor">
                <Select value={form.backupSupervisor} onChange={e => set('backupSupervisor', e.target.value)}>
                  <option value="">Select Backup</option>
                  {state.data.fmcSupervisors?.map(s => <option key={s._id} value={s._id}>{s.name} ({s.employeeId})</option>)}
                </Select>
              </Field>
            </div>
          )}
          {activeTab === 'MACHINES' && (
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-[#768390] uppercase tracking-wider">Select machines to include in this FMC contract:</p>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                {machines.map(m => {
                  const isSelected = (form.machines || []).includes(m._id);
                  return (
                    <div key={m._id} onClick={() => {
                      const cur = form.machines || [];
                      set('machines', isSelected ? cur.filter(id => id !== m._id) : [...cur, m._id]);
                    }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-[#f0883e]/50 bg-[#f0883e]/5 text-[#f0883e]' : 'border-border-main bg-bg-deep text-text-dim hover:border-text-dim'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-[#f0883e] border-[#f0883e]' : 'border-border-main'}`}>
                          {isSelected && <Check size={10} className="text-black" />}
                        </div>
                        <div>
                          <p className="font-black text-xs text-text-main">{m.name}</p>
                          <p className="text-[9px] font-mono text-text-dim/60">{m.model}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] font-mono text-[#444c56]">{(form.machines || []).length} machine(s) selected</p>
            </div>
          )}
          {activeTab === 'BILLING' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Fixed Monthly Charge (₹)', key: 'fixedMonthlyCharge' },
                { label: 'Hourly Billing Rate (₹)', key: 'hourlyRate' },
                { label: 'Min. Billing Hours / Month', key: 'minBillingHours' },
                { label: 'Overtime Hour Rate (₹)', key: 'overtimeRate' },
              ].map(f => (
                <Field key={f.key} label={f.label}>
                  <Input type="number" value={form[f.key]} onChange={e => set(f.key, parseFloat(e.target.value) || 0)} />
                </Field>
              ))}
              {[
                { label: 'Breakdown Coverage', key: 'breakdownCoverage' },
                { label: 'Parts Included', key: 'partsIncluded' },
                { label: 'Consumables Included', key: 'consumablesIncluded' },
              ].map(f => (
                <Field key={f.key} label={f.label}>
                  <div onClick={() => set(f.key, !form[f.key])}
                    className={`w-12 h-6 rounded-full cursor-pointer transition-all flex items-center ${form[f.key] ? 'bg-[#3fb950] justify-end pr-1' : 'bg-border-main justify-start pl-1'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </Field>
              ))}
            </div>
          )}
          {activeTab === 'SLA' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Breakdown Response Time (hrs)">
                <Input type="number" value={form.slaResponseTime} onChange={e => set('slaResponseTime', parseInt(e.target.value) || 0)} />
              </Field>
              <Field label="Resolution Time (hrs)">
                <Input type="number" value={form.slaResolutionTime} onChange={e => set('slaResolutionTime', parseInt(e.target.value) || 0)} />
              </Field>
              <div className="col-span-2 p-4 bg-bg-deep border border-border-main rounded-xl">
                <p className="text-[10px] font-black text-[#f0883e] uppercase tracking-widest mb-3 flex items-center gap-2"><Shield size={12} /> Escalation Matrix</p>
                <div className="space-y-2 text-[10px] font-mono text-text-dim">
                  {[
                    `${form.slaResponseTime || 2} hrs → Supervisor Manager`,
                    `${(form.slaResponseTime || 2) * 2} hrs → Service Manager`,
                    `${(form.slaResponseTime || 2) * 4} hrs → Regional Head`,
                    `${(form.slaResponseTime || 2) * 6} hrs → Operations Head`,
                  ].map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[#f0883e]" />
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-border-main flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            {tabs.indexOf(activeTab) > 0 && (
              <button onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) - 1])}
                className="px-5 py-2.5 border border-border-main text-text-dim hover:text-text-main rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                Previous
              </button>
            )}
            {tabs.indexOf(activeTab) < tabs.length - 1 && (
              <button onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) + 1])}
                className="px-5 py-2.5 bg-bg-active text-text-main rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-bg-card transition-colors">
                Next
              </button>
            )}
          </div>
          <button onClick={handleSave}
            className="px-8 py-2.5 bg-[#f0883e] text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-[#ffab70] transition-all shadow-lg shadow-orange-500/20">
            {contract ? 'UPDATE CONTRACT' : 'AUTHORIZE CONTRACT'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Contracts List View ────────────────────────────────────────────────────
const FMCContracts = () => {
  const { fmcContracts = [], user } = state.data;
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const filtered = fmcContracts.filter(c =>
    [c.customerName, c.agreementNumber, c.siteName, c.companyName].some(v =>
      (v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleDelete = async (id) => {
    const ok = await confirmAction('Terminate Contract?', 'This will permanently remove the FMC agreement.', 'warning');
    if (ok) {
      await state.deleteFMCContract(id);
      showNotification('Contract terminated', 'success');
    }
  };

  const generateContractPDF = (contract) => {
    const doc = new jsPDF();
    const { machines, fmcSupervisors } = state.data;

    // Header
    doc.setFillColor(240, 136, 62); // LiuGong Amber
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('LIUGONG', 20, 25);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('FULL MAINTENANCE CONTRACT (FMC)', 85, 23);

    // Agreement Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`AGREEMENT: ${contract.agreementNumber}`, 20, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 60, 190, 60);

    let currentY = 70;

    // 1. Customer Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. CUSTOMER DETAILS', 20, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Company Name: ${contract.companyName || 'N/A'}`, 25, currentY);
    doc.text(`Customer Name: ${contract.customerName || 'N/A'}`, 110, currentY);
    currentY += 7;
    doc.text(`Contact Person: ${contract.contactPerson || 'N/A'}`, 25, currentY);
    doc.text(`Mobile: ${contract.mobile || 'N/A'}`, 110, currentY);
    currentY += 7;
    doc.text(`Site Name: ${contract.siteName || 'N/A'}`, 25, currentY);
    doc.text(`Email: ${contract.email || 'N/A'}`, 110, currentY);
    currentY += 7;
    doc.text(`Site Address: ${contract.siteAddress || 'N/A'}`, 25, currentY);

    currentY += 15;

    // 2. Contract Terms
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. CONTRACT TERMS & FIELD OPERATIONS', 20, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Start Date: ${contract.startDate || 'N/A'}`, 25, currentY);
    doc.text(`End Date: ${contract.endDate || 'N/A'}`, 110, currentY);
    currentY += 7;
    doc.text(`Billing Cycle: ${contract.billingCycle || 'Monthly'}`, 25, currentY);
    doc.text(`Status: ${contract.status || 'Active'}`, 110, currentY);
    currentY += 7;

    const assignedSup = fmcSupervisors.find(s => s._id === contract.assignedSupervisor);
    const backupSup = fmcSupervisors.find(s => s._id === contract.backupSupervisor);

    doc.text(`Primary Supervisor: ${assignedSup ? `${assignedSup.name} (${assignedSup.employeeId}) - Mobile: ${assignedSup.mobile}` : 'Unassigned'}`, 25, currentY);
    currentY += 7;
    doc.text(`Backup Supervisor: ${backupSup ? `${backupSup.name} (${backupSup.employeeId})` : 'Unassigned'}`, 25, currentY);

    currentY += 15;

    // 3. Machines Covered
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. MACHINES COVERED', 20, currentY);

    const contractMachines = machines.filter(m => (contract.machines || []).includes(m._id));
    const machineData = contractMachines.map(m => [m.name, m.model, m.serialNumber, m.assetValue ? `Rs. ${m.assetValue.toLocaleString('en-IN')}` : 'N/A']);

    doc.autoTable({
      startY: currentY + 5,
      head: [['Machine Name', 'Model', 'Serial Number', 'Asset Value']],
      body: machineData.length ? machineData : [['No machines assigned', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [22, 27, 34], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // 4. Billing & SLA Details
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. BILLING & SLA DETAILS', 20, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fixed Monthly Charge: Rs. ${(contract.fixedMonthlyCharge || 0).toLocaleString('en-IN')}`, 25, currentY);
    doc.text(`Min Billing Hours: ${contract.minBillingHours || 0} hrs / month`, 110, currentY);
    currentY += 7;
    doc.text(`Hourly Rate: Rs. ${(contract.hourlyRate || 0).toLocaleString('en-IN')} / hr`, 25, currentY);
    doc.text(`Overtime Rate: Rs. ${(contract.overtimeRate || 0).toLocaleString('en-IN')} / hr`, 110, currentY);
    currentY += 7;
    doc.text(`Breakdown Coverage Included: ${contract.breakdownCoverage ? 'Yes' : 'No'}`, 25, currentY);
    doc.text(`Standard Response Time: ${contract.slaResponseTime || 2} hrs`, 110, currentY);
    currentY += 7;
    doc.text(`Parts Included: ${contract.partsIncluded ? 'Yes' : 'No'}`, 25, currentY);
    doc.text(`Consumables Included: ${contract.consumablesIncluded ? 'Yes' : 'No'}`, 110, currentY);

    currentY += 15;

    // Escalation Matrix
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Service Escalation Matrix', 20, currentY);
    currentY += 8;

    const rTime = contract.slaResponseTime || 2;
    doc.autoTable({
      startY: currentY,
      head: [['Time Elapsed', 'Escalation Level', 'Action Required']],
      body: [
        [`${rTime} Hours`, 'Supervisor Manager', 'Initial Site Visit & Diagnosis'],
        [`${rTime * 2} Hours`, 'Service Manager', 'Resource Allocation & Priority Support'],
        [`${rTime * 4} Hours`, 'Regional Head', 'OEM Engineering Intervention'],
        [`${rTime * 6} Hours`, 'Operations Head', 'Machine Replacement / Major SLA Compensation']
      ],
      theme: 'grid',
      headStyles: { fillColor: [240, 136, 62], textColor: 0 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    // 5. Standard T&C
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5. STANDARD TERMS & CONDITIONS', 20, currentY);
    currentY += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const terms = [
      "1. INVOICING: Invoices will be generated automatically at the end of each billing cycle based on the hours logged by the assigned supervisor.",
      "2. PAYMENT TERMS: All payments must be cleared within 15 days of invoice generation to avoid late penalty charges.",
      "3. MACHINE USAGE: The customer is responsible for ensuring machines are operated only by certified personnel within the prescribed capacity.",
      "4. BREAKDOWN LIABILITY: LiuGong is not liable for machine damages caused by customer negligence or unauthorized modifications.",
      "5. TERMINATION: Either party may terminate this agreement with a 30-day written notice. Any outstanding dues must be settled immediately."
    ];

    terms.forEach(term => {
      const splitText = doc.splitTextToSize(term, 170);
      doc.text(splitText, 20, currentY);
      currentY += (splitText.length * 4) + 2;
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('This is an electronically generated enterprise document and does not require a physical signature.', 105, 280, { align: 'center' });
      doc.text('LIUGONG INDUSTRIAL ASSET MANAGEMENT SYSTEM', 105, 285, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, 190, 285);
    }

    doc.save(`FMC_Agreement_${contract.agreementNumber}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight uppercase italic">FMC Contracts</h2>
          <p className="text-[10px] font-bold text-text-dim/60 uppercase tracking-[0.2em] mt-1 font-mono">Agreement Registry — {fmcContracts.length} Total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim/60" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contracts..." className="pl-9 pr-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-xs text-text-main font-bold focus:border-[#f0883e] outline-none w-64" />
          </div>
          {hasPermission(user, 'fmc', 'create') && user?.role === 'OEM' && (
            <button onClick={() => { setEditingContract(null); setShowModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#f0883e] text-black text-[11px] font-black rounded-xl hover:bg-[#ffab70] transition-all shadow-lg shadow-orange-500/20">
              <Plus size={14} /> NEW CONTRACT
            </button>
          )}
        </div>
      </div>

      <div className="bg-bg-card border border-border-main rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-active border-b border-border-main">
              {['Agreement #', 'Customer / Site', 'Machines', 'Billing', 'Period', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-main/50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-16 text-center text-[10px] font-bold text-text-dim/60 uppercase tracking-widest">No contracts found</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c._id || i} className="hover:bg-bg-active transition-colors group">
                <td className="px-5 py-4">
                  <span className="font-mono font-black text-[#f0883e] text-xs">{c.agreementNumber}</span>
                </td>
                <td className="px-5 py-4">
                  <p className="font-black text-text-main text-xs">{c.customerName}</p>
                  <p className="text-[9px] font-mono text-text-dim/60">{c.siteName}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="px-2 py-0.5 bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 rounded text-[9px] font-black">
                    {(c.machines || []).length} Units
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="text-xs font-mono text-text-main">₹{((c.fixedMonthlyCharge || 0)).toLocaleString('en-IN')}</p>
                  <p className="text-[9px] font-bold text-text-dim/60">{c.billingCycle}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-text-dim">
                  <p>{c.startDate || '—'}</p>
                  <p className="text-text-dim/60">to {c.endDate || '—'}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${c.status === 'Active' ? 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20' :
                      c.status === 'Expired' ? 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/20' :
                        'bg-[#768390]/10 text-[#768390] border-[#768390]/20'
                    }`}>{c.status || 'Draft'}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generateContractPDF(c)} title="Download Agreement PDF"
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-active text-text-dim hover:text-[#58a6ff] hover:bg-[#58a6ff]/10 border border-border-main transition-all">
                      <FileText size={13} />
                    </button>
                    {hasPermission(user, 'fmc', 'update') && user?.role === 'OEM' && (
                      <button onClick={() => { setEditingContract(c); setShowModal(true); }} title="Edit Contract"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-active text-text-dim hover:text-[#f0883e] hover:bg-[#f0883e]/10 border border-border-main transition-all">
                        <Edit3 size={13} />
                      </button>
                    )}
                    {hasPermission(user, 'fmc', 'delete') && user?.role === 'OEM' && (
                      <button onClick={() => handleDelete(c._id)} title="Terminate Contract"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-active text-text-dim hover:text-rose-500 hover:bg-rose-500/10 border border-border-main transition-all">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ContractFormModal contract={editingContract} onClose={() => { setShowModal(false); setEditingContract(null); }} />
      )}
    </div>
  );
};

export default FMCContracts;
