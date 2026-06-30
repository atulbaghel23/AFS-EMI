import React, { useState, useRef, useEffect } from 'react';
import { state } from '../state';
import { formatINR, showNotification } from '../utils';
import { usePersistentState } from '../hooks/usePersistentState';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  TrendingUp, AlertCircle, Activity, Truck, ChevronRight, ShieldCheck,
  CreditCard, History, HardHat, ArrowUpRight, ArrowDownRight, Filter,
  ChevronDown, Search, Check, Calculator, Clock, Layers, Activity as ActivityIcon,
  Download, BarChart3, Wrench, Package, FileText, HandCoins, Construction,
  Maximize2
} from 'lucide-react';

// GitHub-style Asset Selector Dropdown with Search
// GitHub-style Multi-Asset Selector Dropdown
const AssetFilter = ({ options, selected, onSelect, allLabel = 'ALL MACHINES', filterName = 'ASSET' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (opt) => {
    if (opt === allLabel) {
      onSelect([allLabel]);
    } else {
      let next;
      if (selected.includes(allLabel)) {
        next = [opt];
      } else {
        next = selected.includes(opt)
          ? selected.filter(s => s !== opt)
          : [...selected, opt];
      }
      if (next.length === 0 || next.length === options.length - 1) {
        onSelect([allLabel]);
      } else {
        onSelect(next);
      }
    }
  };

  const isSelected = (opt) => selected.includes(opt);

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-active border border-border-main rounded-md text-[11px] font-bold text-text-main hover:border-text-dim transition-all"
      >
        <Filter size={12} className="text-text-dim" />
        <span className="truncate max-w-[200px]">
          {selected.includes(allLabel)
            ? `OVERALL ${filterName === 'ASSET' ? 'FLEET' : 'PORTFOLIO'}`
            : selected.length === 1
              ? `${filterName}: ${selected[0]}`
              : `${selected.length} ${filterName}S SELECTED`}
        </span>
        <ChevronDown size={12} className={`text-text-dim shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[100] mt-2 w-72 bg-bg-card border border-border-main rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-border-main bg-bg-deep/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search protocol nodes..."
                className="w-full bg-bg-deep border border-border-main rounded-md py-2 pl-8 pr-3 text-[10px] text-text-main focus:outline-none focus:border-primary transition-all placeholder:text-text-dim/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className="w-full text-left px-4 py-3 text-[11px] hover:bg-bg-active flex items-center justify-between group transition-colors border-b border-border-main/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded border border-border-main flex items-center justify-center transition-all ${isSelected(opt) ? 'bg-primary border-primary' : 'bg-bg-deep'}`}>
                      {isSelected(opt) && <Check size={10} className="text-white" />}
                    </div>
                    <span className={`transition-colors ${isSelected(opt) ? 'text-primary font-bold' : 'text-text-main'}`}>
                      {opt === allLabel ? `📊 ${allLabel} (OVERALL)` : opt}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-[10px] text-text-dim font-mono italic">
                No matching nodes detected
              </div>
            )}
          </div>
          {selected.length > 1 && !selected.includes(allLabel) && (
            <div className="p-2 border-t border-border-main bg-bg-deep/30">
              <button
                onClick={() => onSelect([allLabel])}
                className="w-full py-1.5 text-[9px] font-black text-text-dim uppercase tracking-widest hover:text-primary transition-colors"
              >
                Reset to Overall {filterName === 'ASSET' ? 'Fleet' : 'Portfolio'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const StatCard = ({ icon: Icon, label, value, accent, trend, isUp }) => (
  <div className="bg-bg-card border border-border-main rounded-xl p-5 group hover:border-text-dim transition-all relative overflow-hidden shadow-sm">
    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8" />
    <div className="flex items-center justify-between mb-4">
      <span className="text-[10px] font-bold text-text-dim tracking-widest font-mono uppercase">{label}</span>
      <div className={`p-1.5 bg-bg-deep border border-border-main rounded-lg group-hover:scale-110 group-hover:border-primary/30 transition-all`}>
        <Icon size={14} className={accent} />
      </div>
    </div>
    <div className="flex items-baseline justify-between">
      <div className="text-xl font-black text-text-main font-mono tracking-tighter">{value}</div>
      {trend && (
        <div className={`flex items-center gap-0.5 text-[10px] font-bold font-mono ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trend}
        </div>
      )}
    </div>
  </div>
);



const DateFilter = ({ range, onChange }) => (
  <div className="flex items-center gap-2 bg-bg-active border border-border-main rounded-md px-3 py-1.5 shadow-sm">
    <Clock size={12} className="text-text-dim" />
    <input
      type="date"
      className="bg-transparent text-[10px] font-bold text-text-main focus:outline-none"
      value={range.start}
      onChange={(e) => onChange({ ...range, start: e.target.value })}
    />
    <span className="text-text-dim text-[10px]">→</span>
    <input
      type="date"
      className="bg-transparent text-[10px] font-bold text-text-main focus:outline-none"
      value={range.end}
      onChange={(e) => onChange({ ...range, end: e.target.value })}
    />
  </div>
);

const ORMDashboard = () => {
  const { loans = [], payments = [] } = state.data;
  const [viewMode, setViewMode] = usePersistentState('orm_view_mode', 'machine');
  const [selectedAssets, setSelectedAssets] = usePersistentState('orm_selected_assets', ['ALL MACHINES']);
  const [selectedCustomers, setSelectedCustomers] = usePersistentState('orm_selected_customers', ['ALL CUSTOMERS']);
  const [selectedMachine, setSelectedMachine] = useState(null); // for machine drill-down
  const [storedDateRange, setDateRange] = usePersistentState('orm_date_range', {
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Ensure end date always reaches today so we don't exclude new payments if localStorage is stale
  const todayStr = new Date().toISOString().split('T')[0];
  const dateRange = {
    start: storedDateRange.start,
    end: storedDateRange.end < todayStr ? todayStr : storedDateRange.end
  };

  const getLoanLabel = (l) => `${l.machineName} (${l.invoiceNumber || l._id.toString().substring(l._id.toString().length - 4)})`;
  const getCustomerLabel = (l) => l.customerId?.name || 'Unknown Customer';

  const approvedLoans = loans.filter(l => l.approvalStatus === 'Active');
  const machineOptions = ['ALL MACHINES', ...approvedLoans.map(getLoanLabel)];
  const customerOptions = ['ALL CUSTOMERS', ...new Set(approvedLoans.map(getCustomerLabel))];

  // Filtered Loans based on viewMode and corresponding selection
  const filteredLoans = viewMode === 'machine'
    ? (selectedAssets.includes('ALL MACHINES') ? approvedLoans : approvedLoans.filter(l => selectedAssets.includes(getLoanLabel(l))))
    : (selectedCustomers.includes('ALL CUSTOMERS') ? approvedLoans : approvedLoans.filter(l => selectedCustomers.includes(getCustomerLabel(l))));

  // Filtered Payments based on viewMode, individual selection, AND date range
  const filteredPayments = payments.filter(p => {
    let pDateStr = '';
    try {
      pDateStr = new Date(p.date).toISOString().split('T')[0];
    } catch (e) {
      // Fallback if date is somehow invalid
      pDateStr = new Date().toISOString().split('T')[0];
    }
    const inDateRange = pDateStr >= dateRange.start && pDateStr <= dateRange.end;
    if (!inDateRange) return false;

    if (viewMode === 'machine') {
      if (selectedAssets.includes('ALL MACHINES')) return true;
      const loanIdStr = (p.loanId?._id || p.loanId)?.toString();
      const associatedLoan = approvedLoans.find(l => l._id === loanIdStr);
      return associatedLoan && selectedAssets.includes(getLoanLabel(associatedLoan));
    } else {
      if (selectedCustomers.includes('ALL CUSTOMERS')) return true;
      const loanIdStr = (p.loanId?._id || p.loanId)?.toString();
      const associatedLoan = approvedLoans.find(l => l._id === loanIdStr);
      return associatedLoan && selectedCustomers.includes(getCustomerLabel(associatedLoan));
    }
  });

  const [showGlobalReportFormats, setShowGlobalReportFormats] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reportRef.current && !reportRef.current.contains(event.target)) {
        setShowGlobalReportFormats(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExecuteGlobalReport = async (format) => {
    setShowGlobalReportFormats(false);
    showNotification(`Strategic Protocol: Initiating Global ${format.toUpperCase()} Synthesis...`, 'info');

    try {
      const response = await fetch(`${state.apiUrl}/reports/global/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.data.user?.token}`
        },
        body: JSON.stringify({
          selectedAssets: viewMode === 'machine' ? selectedAssets : selectedCustomers,
          viewMode,
          dateRange
        })
      });

      if (!response.ok) throw new Error('Synthesis Protocol Error');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : (format === 'ppt' ? 'pptx' : 'pdf');
      const fileName = `Global_Strategic_Report_${new Date().getTime()}.${ext}`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification(`Global ${format.toUpperCase()} Report Exported Successfully`);
    } catch (error) {
      console.error('Report error:', error);
      showNotification('Global Protocol Failure: Report Generation Aborted', 'error');
    }
  };

  const totalRecovery = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExposure = filteredLoans.reduce((sum, l) => sum + (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  const totalFinanced = filteredLoans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const overdueAmount = filteredLoans.reduce((sum, l) => sum + (l.schedule || []).filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date()).reduce((s, inst) => s + inst.emi, 0), 0);

  const reportMonths = [];
  let curr = new Date(new Date(dateRange.start).getFullYear(), new Date(dateRange.start).getMonth(), 1);
  const endLimit = new Date(dateRange.end);
  while (curr <= endLimit) {
    reportMonths.push({
      month: curr.toLocaleString('default', { month: 'short' }).toUpperCase(),
      start: new Date(curr.getFullYear(), curr.getMonth(), 1),
      end: new Date(curr.getFullYear(), curr.getMonth() + 1, 0)
    });
    curr.setMonth(curr.getMonth() + 1);
  }

  let rb = filteredLoans.reduce((acc, loan) => acc + (loan.schedule || []).filter(s => new Date(s.dueDate) < reportMonths[0]?.start && s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  const monthlyData = reportMonths.map(m => {
    const opening = rb;
    const monthlyDue = filteredLoans.reduce((sum, loan) => sum + (loan.schedule || []).filter(s => { const d = new Date(s.dueDate); return d >= m.start && d <= m.end; }).reduce((s, inst) => s + inst.emi, 0), 0);
    const monthlyReceived = filteredPayments.filter(p => { const d = new Date(p.date); return d >= m.start && d <= m.end; }).reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdue = Math.max(0, opening + monthlyDue - monthlyReceived);
    const closing = overdue;
    const progress = (opening + monthlyDue) > 0 ? Math.min(100, Math.round((monthlyReceived / (opening + monthlyDue)) * 100)) : 'NA';
    rb = closing;
    return { month: m.month, opening, due: monthlyDue, received: monthlyReceived, overdue, closing, progress };
  });

  // Machine-specific monthly drill-down data
  const machineDrillMonthlyData = (() => {
    if (!selectedMachine) return [];
    const loan = selectedMachine;
    const loanPayments = payments.filter(p => {
      const loanIdStr = (p.loanId?._id || p.loanId)?.toString();
      return loanIdStr === loan._id;
    });
    let rb2 = (loan.schedule || []).filter(s => new Date(s.dueDate) < (reportMonths[0]?.start || new Date()) && s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0);
    return reportMonths.map(m => {
      const opening = rb2;
      const monthlyDue = (loan.schedule || []).filter(s => { const d = new Date(s.dueDate); return d >= m.start && d <= m.end; }).reduce((s, inst) => s + inst.emi, 0);
      const monthlyReceived = loanPayments.filter(p => { try { const d = new Date(p.date); return d >= m.start && d <= m.end; } catch(e) { return false; } }).reduce((sum, p) => sum + (p.amount || 0), 0);
      const overdue = Math.max(0, opening + monthlyDue - monthlyReceived);
      const closing = overdue;
      const progress = (opening + monthlyDue) > 0 ? Math.min(100, Math.round((monthlyReceived / (opening + monthlyDue)) * 100)) : 'NA';
      rb2 = closing;
      return { month: m.month, opening, due: monthlyDue, received: monthlyReceived, overdue, closing, progress };
    });
  })();

  return (
    <div className="h-full flex flex-col gap-6 animate-slide-up pb-10">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] flex items-center gap-2">
            <ActivityIcon size={12} className="text-primary" /> RECOVERY NODE MATRIX
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[8px] font-black text-green-500 uppercase tracking-widest">
            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
            LIVE FEED
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative" ref={reportRef}>
            <button
              onClick={() => setShowGlobalReportFormats(!showGlobalReportFormats)}
              className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-black text-primary hover:bg-primary/20 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"
            >
              <Download size={14} className="text-primary" /> GENERATE STRATEGIC REPORT
            </button>

            {showGlobalReportFormats && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-bg-card border border-border-main rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="px-4 py-2 text-[8px] font-black text-text-dim uppercase tracking-widest border-b border-border-main">Select Report Protocol</p>
                <button onClick={() => handleExecuteGlobalReport('excel')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-text-main hover:bg-bg-active hover:text-green-500 transition-colors border-b border-border-main/50">
                  <FileText size={14} className="text-green-500" /> MASTER EXCEL (.xlsx)
                </button>
                <button onClick={() => handleExecuteGlobalReport('ppt')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-text-main hover:bg-bg-active hover:text-rose-500 transition-colors border-b border-border-main/50">
                  <Maximize2 size={14} className="text-rose-500" /> VISUAL PPT DECK (.pptx)
                </button>
                <button onClick={() => handleExecuteGlobalReport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-text-main hover:bg-bg-active hover:text-primary transition-colors">
                  <ShieldCheck size={14} className="text-primary" /> ANALYTICS PDF (.pdf)
                </button>
              </div>
            )}
          </div>
          {/* <DateFilter range={dateRange} onChange={setDateRange} /> */}
          <div className="flex bg-bg-active p-1 rounded-lg border border-border-main">
            <button
              onClick={() => setViewMode('machine')}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${viewMode === 'machine' ? 'bg-primary text-black shadow-sm' : 'text-text-dim hover:text-text-main'}`}
            >
              Machine Centric
            </button>
            <button
              onClick={() => { setViewMode('customer'); setSelectedMachine(null); }}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${viewMode === 'customer' ? 'bg-primary text-black shadow-sm' : 'text-text-dim hover:text-text-main'}`}
            >
              Customer Centric
            </button>
          </div>
          {viewMode === 'machine' ? (
            <AssetFilter options={machineOptions} selected={selectedAssets} onSelect={setSelectedAssets} allLabel="ALL MACHINES" filterName="ASSET" />
          ) : (
            <AssetFilter options={customerOptions} selected={selectedCustomers} onSelect={setSelectedCustomers} allLabel="ALL CUSTOMERS" filterName="CUSTOMER" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 shrink-0">
            <StatCard icon={History} label="TOTAL FINANCED" value={formatINR(totalFinanced)} accent="text-text-dim" />
            <StatCard icon={TrendingUp} label="TOTAL COLLECTED" value={formatINR(totalRecovery)} accent="text-green-500" />
            <StatCard icon={ActivityIcon} label="REMAINING AMOUNT" value={formatINR(totalExposure)} accent="text-primary" />
            <StatCard icon={AlertCircle} label="OVERDUE AMOUNT" value={formatINR(overdueAmount)} accent="text-red-500" />

            <div className="bg-bg-card border border-border-main rounded-xl p-4 flex flex-col justify-between group hover:border-text-dim transition-all shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-text-dim tracking-widest font-mono uppercase">COLLECTION HEALTH</span>
                <ActivityIcon size={14} className="text-primary" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-xl font-bold text-text-main font-mono">
                  {(() => {
                    const expectedTotal = totalRecovery + totalExposure;
                    let health = expectedTotal > 0 ? Math.round((totalRecovery / expectedTotal) * 100) : 0;
                    if (totalExposure > 0 && health >= 100) health = 99;
                    return health;
                  })()}%
                </span>
                <div className="flex-1 h-1.5 bg-bg-deep border border-border-main rounded-full mb-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(() => {
                        const expectedTotal = totalRecovery + totalExposure;
                        let health = expectedTotal > 0 ? Math.round((totalRecovery / expectedTotal) * 100) : 0;
                        if (totalExposure > 0 && health >= 100) health = 99;
                        return health;
                      })()}%`
                    }}
                  />
                </div>
              </div>
            </div>
            <StatCard icon={Truck} label={viewMode === 'machine' ? 'FLEET NODES' : 'PORTFOLIO UNITS'} value={`${filteredLoans.length} Units`} accent="text-blue-500" />
          </div>

          <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-0">
            <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
              <div className="flex-1 bg-bg-card border border-border-main rounded-2xl overflow-hidden flex flex-col shadow-xl">
                <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex items-center justify-between">
                  {viewMode === 'machine' && selectedMachine ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedMachine(null)}
                        className="flex items-center gap-1.5 text-[9px] font-black text-text-dim hover:text-primary transition-colors uppercase tracking-widest group"
                      >
                        <ChevronRight size={12} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                        ALL MACHINES
                      </button>
                      <span className="text-text-dim/40 text-[10px]">/</span>
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest truncate max-w-[280px]">
                        {getLoanLabel(selectedMachine)}
                      </span>
                      <span className="ml-2 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[8px] font-black text-primary uppercase tracking-widest">Monthly Ledger</span>
                    </div>
                  ) : (
                    <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
                      <FileText size={14} className="text-primary" /> {viewMode === 'customer' ? 'CUSTOMER PORTFOLIO LEDGER' : 'MACHINE PORTFOLIO LEDGER'}
                    </h3>
                  )}
                  <div className="flex items-center gap-4 text-[8px] font-bold text-text-dim uppercase tracking-widest">
                    <span>SYNCED: {new Date().toLocaleDateString()}</span>
                    <span>UNIT: INR</span>
                  </div>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-bg-deep z-10">
                      <tr className="border-b border-border-main text-[9px] font-bold text-text-dim uppercase tracking-widest">
                        {viewMode === 'customer' ? (
                          <>
                            <th className="px-6 py-5">Customer</th>
                            <th className="px-6 py-5">Machine</th>
                            <th className="px-6 py-5">Total Expected</th>
                            <th className="px-6 py-5">Remaining</th>
                            <th className="px-6 py-5 text-green-600">Collected</th>
                            <th className="px-6 py-5 text-red-500">Overdue</th>
                            <th className="px-6 py-5 text-right">Collection %</th>
                          </>
                        ) : selectedMachine ? (
                          <>
                            <th className="px-6 py-5">Month</th>
                            <th className="px-6 py-5">Openings</th>
                            <th className="px-6 py-5">Due</th>
                            <th className="px-6 py-5 text-green-600">Received</th>
                            <th className="px-6 py-5 text-red-500">Overdue</th>
                            <th className="px-6 py-5">Closing</th>
                            <th className="px-6 py-5 text-right">Collection %</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-5">Machine</th>
                            <th className="px-6 py-5">Total Expected</th>
                            <th className="px-6 py-5">Remaining</th>
                            <th className="px-6 py-5 text-green-600">Collected</th>
                            <th className="px-6 py-5 text-red-500">Overdue</th>
                            <th className="px-6 py-5 text-right">Collection %</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/30">
                      {viewMode === 'customer' ? (
                        (() => {
                          const customers = {};
                          filteredLoans.forEach(l => {
                            const customerIdStr = (l.customerId?._id || l.customerId)?.toString() || 'unknown';
                            if (!customers[customerIdStr]) {
                              customers[customerIdStr] = {
                                id: customerIdStr,
                                name: getCustomerLabel(l),
                                machineCount: 0,
                                remaining: 0,
                                collected: 0,
                                overdue: 0,
                                loans: []
                              };
                            }
                            const c = customers[customerIdStr];
                            c.machineCount++;
                            c.remaining += (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
                            c.collected += (l.schedule || []).reduce((sum, s) => {
                              const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0
                                ? s.paidAmount
                                : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
                              return sum + principalPaid + (s.paidOverdueInterest || 0);
                            }, 0);
                            c.overdue += (l.schedule || []).filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date()).reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
                            c.loans.push(l);
                          });

                          return Object.values(customers).map((c) => {
                            const expectedTotal = c.collected + c.remaining;
                            let collPercent = expectedTotal > 0 ? Math.round((c.collected / expectedTotal) * 100) : 0;
                            if (c.remaining > 0 && collPercent >= 100) collPercent = 99;

                            return (
                              <tr key={c.id} onClick={() => {
                                if (c.machineCount === 1) {
                                  state.setState({ view: 'loan-details', selectedLoanId: c.loans[0]._id, previousView: 'dashboard' });
                                } else {
                                  state.setState({ view: 'customer-analytics', selectedCustomerId: c.id, previousView: 'dashboard' });
                                }
                              }} className="hover:bg-bg-active transition-colors group cursor-pointer">
                                <td className="px-6 py-5 text-[11px] font-black text-text-main">{c.name}</td>
                                <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{c.machineCount} {c.machineCount === 1 ? 'Machine' : 'Machines'}</td>
                                <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{formatINR(expectedTotal)}</td>
                                <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{formatINR(c.remaining)}</td>
                                <td className="px-6 py-5 text-[11px] font-mono font-bold text-green-600">{formatINR(c.collected)}</td>
                                <td className="px-6 py-5 text-[11px] font-mono font-bold text-red-500">{formatINR(c.overdue)}</td>
                                <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="w-16 h-1 bg-bg-deep rounded-full overflow-hidden border border-border-main">
                                      <div className={`h-full ${collPercent > 50 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, collPercent)}%` }} />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-text-main">{collPercent}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()
                      ) : selectedMachine ? (
                        /* ── Drill-Down: Monthly ledger for selected machine ── */
                        machineDrillMonthlyData.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-16 text-center text-[10px] font-mono text-text-dim italic">
                              No monthly data available for the selected date range.
                            </td>
                          </tr>
                        ) : (
                          machineDrillMonthlyData.map((row, i) => (
                            <tr key={i} className={`transition-colors group ${row.received > 0 ? 'hover:bg-green-500/5' : 'hover:bg-bg-active'}`}>
                              <td className="px-6 py-5">
                                <span className="text-[11px] font-black text-text-main">{row.month}</span>
                              </td>
                              <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{formatINR(row.opening)}</td>
                              <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{formatINR(row.due)}</td>
                              <td className="px-6 py-5">
                                <span className={`text-[11px] font-mono font-bold ${row.received > 0 ? 'text-green-500' : 'text-text-dim'}`}>
                                  {formatINR(row.received)}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`text-[11px] font-mono font-bold ${row.overdue > 0 ? 'text-red-500' : 'text-text-dim'}`}>
                                  {formatINR(row.overdue)}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-[11px] font-mono text-text-main">{formatINR(row.closing)}</td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="w-20 h-1.5 bg-bg-deep rounded-full overflow-hidden border border-border-main">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${row.progress === 'NA' ? 'bg-text-dim/30' : row.progress > 75 ? 'bg-green-500' : row.progress > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${row.progress === 'NA' ? 0 : row.progress}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] font-mono font-black w-8 text-right ${row.progress === 'NA' ? 'text-text-dim' : row.progress > 75 ? 'text-green-500' : row.progress > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {row.progress === 'NA' ? 'NA' : `${row.progress}%`}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        /* ── Level 1: Machine Portfolio List ── */
                        filteredLoans.map((l, i) => {
                          const remaining = (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
                          const collected = (l.schedule || []).reduce((sum, s) => {
                            const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0
                              ? s.paidAmount
                              : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
                            return sum + principalPaid + (s.paidOverdueInterest || 0);
                          }, 0);
                          const overdue = (l.schedule || []).filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date()).reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);

                          const expectedTotal = collected + remaining;
                          let collPercent = expectedTotal > 0 ? Math.round((collected / expectedTotal) * 100) : 0;
                          if (remaining > 0 && collPercent >= 100) collPercent = 99;

                          return (
                            <tr key={l._id || i} onClick={() => setSelectedMachine(l)} className="hover:bg-bg-active transition-colors group cursor-pointer">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                  <div>
                                    <div className="text-[11px] font-black text-text-main leading-snug">{l.machineName}</div>
                                    <div className="text-[9px] font-mono text-text-dim">{l.invoiceNumber || `#${l._id.toString().slice(-4)}`}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{formatINR(expectedTotal)}</td>
                              <td className="px-6 py-5 text-[11px] font-mono text-text-dim">{formatINR(remaining)}</td>
                              <td className="px-6 py-5 text-[11px] font-mono font-bold text-green-600">{formatINR(collected)}</td>
                              <td className="px-6 py-5 text-[11px] font-mono font-bold text-red-500">{overdue > 0 ? formatINR(overdue) : <span className="text-text-dim/40">—</span>}</td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="w-16 h-1 bg-bg-deep rounded-full overflow-hidden border border-border-main">
                                    <div className={`h-full ${collPercent > 50 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, collPercent)}%` }} />
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-text-main">{collPercent}%</span>
                                  <ChevronRight size={12} className="text-text-dim/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 min-h-0">
              <section className="bg-bg-card border border-border-main rounded-2xl p-5 flex flex-col shrink-0 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[9px] font-bold text-text-dim uppercase tracking-widest">EFFICIENCY TREND</h3>
                  <div className="flex items-center gap-1 text-[7px] font-black text-green-500 uppercase tracking-widest">
                    <TrendingUp size={10} /> POSITIVE_CURVE
                  </div>
                </div>
                <div className="h-32 relative flex items-end justify-between px-2 group">
                  <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" preserveAspectRatio="none">
                    <path
                      d={`M ${monthlyData.map((d, i) => `${(i / (monthlyData.length - 1 || 1)) * 300} ${100 - (d.progress === 'NA' ? 0 : d.progress)}`).join(' L ')}`}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2.5"
                    />
                    <path
                      d={`M ${monthlyData.map((d, i) => `${(i / (monthlyData.length - 1 || 1)) * 300} ${100 - (d.progress === 'NA' ? 0 : d.progress)}`).join(' L ')} L ${monthlyData.length > 0 ? 300 : 0} 100 L 0 100 Z`}
                      fill="url(#gradient)"
                      opacity="0.1"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-primary)" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {monthlyData.map(m => (
                    <span key={m.month} className="text-[7px] font-bold text-text-dim mt-auto">{m.month}</span>
                  ))}
                </div>
              </section>
            </div>
          </div>
    </div>
  );
};

export default ORMDashboard;
