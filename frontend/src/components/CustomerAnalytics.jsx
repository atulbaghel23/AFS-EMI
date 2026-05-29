import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import { formatINR, showNotification } from '../utils';
import Chart from 'chart.js/auto';
import {
  X,
  Check,
  ChevronDown,
  TrendingUp,
  History,
  Zap,
  Calculator,
  ShieldCheck,
  AlertCircle,
  Activity,
  Truck,
  ArrowLeft,
  Calendar,
  Filter,
  Clock,
  ChevronRight,
  Download,
  Search,
  CreditCard,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Target,
  BrainCircuit,
  Settings2,
  FileSpreadsheet,
  LayoutGrid,
  Construction,
  Layers,
  HardHat,
  DollarSign,
  Mail,
  Loader2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// GitHub-style Asset Selector Dropdown with Search
const AssetFilter = ({ options, selected, onSelect }) => {
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

  const filteredOptions = (options || []).filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1c2128] border border-[#30363d] rounded-md text-[11px] font-bold text-white hover:border-[#768390] transition-all"
      >
        <Filter size={12} className="text-[#768390]" />
        <span className="truncate max-w-[150px]">
          {selected === 'ALL MACHINES' ? 'OVERALL FLEET' : `ASSET: ${selected}`}
        </span>
        <ChevronDown size={12} className={`text-[#444c56] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-[#30363d] bg-[#0d1117]/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#444c56]" size={12} />
              <input
                type="text"
                placeholder="Find an asset..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:outline-none focus:border-[#58a6ff] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onSelect(opt); setIsOpen(false); setSearchTerm(''); }}
                  className="w-full text-left px-4 py-2.5 text-[11px] hover:bg-[#1f242c] flex items-center justify-between group transition-colors border-b border-[#30363d]/30 last:border-0"
                >
                  <span className={selected === opt ? 'text-[#f0883e] font-bold' : 'text-[#adbac7]'}>
                    {opt === 'ALL MACHINES' ? '📊 ALL MACHINES (OVERALL)' : opt}
                  </span>
                  {selected === opt && <Check size={12} className="text-[#f0883e]" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-[10px] text-[#444c56] font-mono italic">
                No matching assets found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 group hover:border-[#444c56] transition-all relative overflow-hidden shadow-2xl">
    <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.01] rounded-full -mr-8 -mt-8" />
    <div className="flex items-center justify-between mb-4">
      <span className="text-[10px] font-bold text-[#768390] tracking-widest font-mono uppercase">{label}</span>
      <div className={`p-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg group-hover:scale-110 transition-all`}>
        <Icon size={14} className={accent} />
      </div>
    </div>
    <div className="text-xl font-black text-white font-mono tracking-tighter">{value}</div>
  </div>
);

const StageCard = ({ title, val, sub, color, border, icon: Icon }) => (
  <div className={`p-4 bg-[#0d1117] border ${border} rounded-2xl space-y-2 hover:bg-[#1c2128] transition-all group cursor-default shadow-lg`}>
    <h4 className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${color}`}>
      <Icon size={12} className="group-hover:rotate-12 transition-transform" /> {title}
    </h4>
    <div>
      <p className="text-sm font-mono font-black text-white">{val}</p>
      <p className="text-[8px] font-bold text-[#444c56] uppercase mt-1 tracking-tight">{sub}</p>
    </div>
  </div>
);

const ProgressItem = ({ label, val, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[9px] font-black uppercase tracking-tight">
      <span className="text-[#768390]">{label}</span>
      <span className="text-white font-mono">{val}</span>
    </div>
    <div className="h-1.5 w-full bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d] shadow-inner">
      <div className={`h-full ${color} shadow-[0_0_8px_currentColor]`} style={{ width: val }} />
    </div>
  </div>
);

const DataRow = ({ label, value, color = "text-white" }) => (
  <div className="flex justify-between items-center group/row">
    <span className="text-[8px] font-bold text-[#444c56] uppercase tracking-wider group-hover/row:text-[#768390] transition-colors">{label}</span>
    <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
  </div>
);

const InsightCard = ({ title, value, desc, color = "text-white", icon: Icon }) => (
  <div className="flex items-start gap-4 p-3 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer group">
    <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#768390] group-hover:text-[#f0883e] group-hover:border-[#f0883e]/50 transition-all">
      <Icon size={14} />
    </div>
    <div>
      <p className="text-[8px] font-black text-[#444c56] uppercase tracking-widest mb-0.5">{title}</p>
      <p className={`text-xs font-mono font-bold ${color} mb-1`}>{value}</p>
      <p className="text-[8px] text-[#444c56] font-medium leading-tight">{desc}</p>
    </div>
  </div>
);

const LedgerCard = ({ label, value, mono = false, highlight = false, accent = false }) => (
  <div className={`p-3 bg-[#0d1117] border border-[#30363d] rounded-xl group hover:border-[#444c56] transition-all ${highlight ? 'border-b-2 border-b-[#f0883e]' : ''}`}>
    <p className="text-[8px] font-bold text-[#444c56] uppercase tracking-[0.15em] mb-1.5 group-hover:text-[#768390] transition-colors">{label}</p>
    <p className={`text-[10px] font-bold truncate ${mono ? 'font-mono' : ''} ${highlight ? 'text-white text-xs' : accent ? 'text-[#f0883e]' : 'text-[#adbac7]'}`}>
      {value}
    </p>
  </div>
);

const FMCCustomerAnalytics = ({ customer }) => {
  const [selectedAsset, setSelectedAsset] = useState('ALL MACHINES');
  const { fmcContracts, fmcTickets, fmcDailyHours, fmcInvoices, machines } = state.data;

  // Filter data for this specific customer
  const myContracts = (fmcContracts || []).filter(c => (c.customerId?._id || c.customerId) === customer._id);
  const myMachineIds = myContracts.flatMap(c => c.machines || []);
  const myMachines = (machines || []).filter(m => myMachineIds.includes(m._id));
  const myMachineNames = myMachines.map(m => m.name);

  // Apply machine-wise filter
  const filteredMachineNames = selectedAsset === 'ALL MACHINES'
    ? myMachineNames
    : [selectedAsset];

  const myTickets = (fmcTickets || []).filter(t => filteredMachineNames.includes(t.machineName));
  const myHours = (fmcDailyHours || []).filter(d => filteredMachineNames.includes(d.machineName || d.machine));
  const myInvoices = (fmcInvoices || []).filter(inv => myContracts.some(c => c._id === (inv.contractId?._id || inv.contractId)));

  const totalHours = myHours.reduce((sum, h) => sum + (h.totalHours || 0), 0);
  const activeTickets = myTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const breakdownCount = myTickets.filter(t => (t.issueType || '').toLowerCase().includes('breakdown') || t.status === 'Requested').length;
  const resolvedTickets = myTickets.filter(t => t.status === 'Resolved' && t.updatedAt && t.createdAt);
  const avgMTTR = resolvedTickets.length > 0 ? (resolvedTickets.reduce((sum, t) => sum + (new Date(t.updatedAt) - new Date(t.createdAt)), 0) / resolvedTickets.length / (1000 * 60 * 60)).toFixed(1) : '0';

  const assetOptions = ['ALL MACHINES', ...myMachineNames];

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => state.goBack()} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#768390] hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
              <ShieldCheck className="text-[#3fb950]" size={20} /> FMC OPERATIONAL LEDGER: {customer.name}
            </h2>
            <p className="text-[9px] font-mono text-[#768390] uppercase tracking-widest mt-1">Full Maintenance Lifecycle Analysis & Telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <AssetFilter options={assetOptions} selected={selectedAsset} onSelect={setSelectedAsset} />
          <button onClick={() => window.print()} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2">
            <Download size={14} className="text-[#3fb950]" /> Export Audit Log
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <StatCard icon={Truck} label={selectedAsset === 'ALL MACHINES' ? "MANAGED ASSETS" : "CURRENT ASSET"} value={selectedAsset === 'ALL MACHINES' ? myMachines.length : selectedAsset} accent="text-[#f0883e]" />
        <StatCard icon={Clock} label="WORK HOURS" value={`${totalHours.toFixed(0)} HRS`} accent="text-[#58a6ff]" />
        <StatCard icon={AlertCircle} label="BREAKDOWNS" value={breakdownCount} accent="text-[#f85149]" />
        <StatCard icon={Activity} label="AVERAGE MTTR" value={`${avgMTTR} HRS`} accent="text-[#3fb950]" />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        <div className="col-span-8 space-y-6 overflow-y-auto custom-scrollbar pr-2">
          <section className="bg-[#161b22] border border-[#30363d] rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#30363d] bg-[#1c2128]/50 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-[#768390] uppercase tracking-[0.2em]">Fleet Operational Status</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0d1117] sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#444c56]">Asset Details</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#444c56]">Logged Hours</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#444c56]">Agreement</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#444c56] text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/50">
                  {myMachines.map(m => (
                    <tr key={m._id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-black text-white text-xs">{m.name}</p>
                        <p className="text-[9px] font-mono text-[#444c56] uppercase mt-0.5">{m.model}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#58a6ff] font-bold">
                        {myHours.filter(h => (h.machineName || h.machine) === m.name).reduce((s, h) => s + (h.totalHours || 0), 0).toFixed(0)} HRS
                      </td>
                      <td className="px-6 py-4 text-[10px] text-[#adbac7]">
                        {myContracts.find(c => (c.machines || []).includes(m._id))?.agreementNumber || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {myTickets.some(t => t.machineName === m.name && !['Resolved', 'Closed'].includes(t.status)) ?
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest">Down</span> :
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#3fb950]/10 border border-[#3fb950]/20 text-[#3fb950] text-[8px] font-black uppercase tracking-widest">Live</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-[#161b22] border border-[#30363d] rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#30363d] bg-[#1c2128]/50 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-[#768390] uppercase tracking-[0.2em]">Critical Incident Feed</h3>
            </div>
            <div className="p-6 space-y-3">
              {myTickets.length > 0 ? myTickets.slice(0, 10).map(t => (
                <div key={t._id} className="p-4 bg-[#0d1117] border border-[#30363d] rounded-2xl flex items-center justify-between group hover:border-[#f0883e]/30 transition-all shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${['Resolved', 'Closed'].includes(t.status) ? 'bg-[#3fb950]' : 'bg-red-500'} shadow-[0_0_8px_currentColor]`} />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase">{t.ticketNumber}</p>
                      <p className="text-[9px] text-[#768390] mt-1 uppercase font-mono tracking-tighter">{t.machineName} // {t.issueType || 'General Maintenance'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-[#adbac7] uppercase tracking-widest">{t.status}</p>
                    <p className="text-[8px] text-[#444c56] mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black text-[#444c56] uppercase tracking-[0.3em]">No maintenance records detected</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-span-4 space-y-6">
          <section className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-2xl">
            <h3 className="text-[10px] font-black text-[#f0883e] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <DollarSign size={12} /> FMC Billing Ledger
            </h3>
            <div className="space-y-4">
              {myInvoices.slice(0, 5).map(inv => (
                <div key={inv._id} className="p-4 bg-[#0d1117] border border-[#30363d] rounded-2xl hover:border-[#3fb950]/30 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-white font-mono">{inv.invoiceNumber}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#3fb950]/10 text-[#3fb950] text-[8px] font-black uppercase tracking-widest">Settled</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-bold text-[#444c56] uppercase">{inv.billingMonth}</p>
                      <p className="text-xl font-black text-white font-mono mt-1">{formatINR(inv.totalInvoice)}</p>
                    </div>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-[#768390] hover:text-white hover:border-[#3fb950]/50 transition-all">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {myInvoices.length === 0 && (
                <div className="py-8 text-center bg-[#0d1117] rounded-2xl border border-dashed border-[#30363d]">
                  <p className="text-[9px] font-black text-[#444c56] uppercase tracking-[0.2em]">No invoices generated</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const CustomerAnalytics = () => {
  const chartRef = useRef(null);
  const [selectedAsset, setSelectedAsset] = useState('ALL MACHINES');
  const [chartType, setChartType] = useState('bar');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { loans, machines, selectedCustomerId, customers, payments } = state.data;

  const customer = customers.find(c => c._id === selectedCustomerId);

  // Derived Data Calculations (Standard EMI/Rental)
  const clientLoans = customer ? loans.filter(l => l.customerId?._id === customer?._id || l.customerId === customer?._id) : [];

  const machineOptions = [
    'ALL MACHINES',
    ...clientLoans.map(l => `${l.machineName} (${l._id.substring(l._id.length - 6).toUpperCase()})`)
  ];

  const filteredLoans = selectedAsset === 'ALL MACHINES'
    ? clientLoans
    : clientLoans.filter(l => `${l.machineName} (${l._id.substring(l._id.length - 6).toUpperCase()})` === selectedAsset);

  const handleDownloadReport = async () => {
    showNotification('Generating Strategic Ledger (.xlsx)...');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('STRATEGIC DASHBOARD');

    // 🎨 COLOR TOKENS
    const COLORS = {
      BLACK: 'FF000000',
      WHITE: 'FFFFFFFF',
      PEACH: 'FFFCE4D6',
      PINK: 'FFF4CCCC',
      NAVY: 'FF1C2128',
      GREEN: 'FF008000',
      RED: 'FFFF0000'
    };

    // 1. MAIN BRANDED HEADER
    worksheet.mergeCells('A1:N1');
    const mainTitle = worksheet.getCell('A1');
    mainTitle.value = `STRATEGIC ASSET RECOVERY PROTOCOL: ${selectedAsset}`;
    mainTitle.style = {
      font: { name: 'Segoe UI', bold: true, size: 14, color: { argb: COLORS.WHITE } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BLACK } }
    };
    worksheet.getRow(1).height = 30;

    // 2. SECTION 1: RECOVERY MATRIX (MANUAL WITH AUTOFILTER)
    const summaryHeaders = [
      'Customer', 'MARGIN', 'FUNDING', 'TOTAL', 'No. of EMI', 'REC_AMOUNT', 'REC_EMI',
      'BAL_AMOUNT', 'BAL_EMI', 'OVD_AMOUNT', 'OVD_EMI', 'Last Paid', 'Remarks', 'Interest'
    ];
    const sHeaderRow = worksheet.addRow(summaryHeaders);
    sHeaderRow.height = 25;
    sHeaderRow.eachCell(cell => {
      cell.style = {
        font: { name: 'Segoe UI', bold: true, size: 10 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PEACH } },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      };
    });

    filteredLoans.forEach(l => {
      const paid = l.schedule.filter(s => s.status === 'Paid');
      const today = new Date();
      const overdue = l.schedule.filter(s => s.status === 'Pending' && new Date(s.dueDate) < today);
      const margin = l.margin || Math.round(l.principal * 0.15);
      const funding = l.principal || 0;
      const overdueAmt = overdue.length * l.emi;
      const lastPaid = paid.length > 0 ? paid[paid.length - 1].dueDate : '--';
      const interest = overdueAmt > 0 ? Math.round(overdueAmt * 0.18 * (overdue.length / 12)) : 0;

      const row = worksheet.addRow([
        customer?.name || 'VIKAS',
        margin, funding, margin + funding, l.schedule.length,
        paid.length * l.emi, paid.length,
        (l.schedule.length - paid.length) * l.emi, l.schedule.length - paid.length,
        overdueAmt, overdue.length, lastPaid,
        '--Stable--', interest
      ]);

      row.height = 22;
      row.eachCell(cell => {
        cell.style = {
          font: { name: 'Segoe UI', size: 9 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PINK } },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };
        if ([2, 3, 4, 6, 8, 10, 14].includes(cell.col)) cell.numFmt = '#,##0';
      });
    });

    // 3. SECTION 2: DETAILED AMORTIZATION LEDGER
    worksheet.addRow([]); worksheet.addRow([]); // Spacing

    const ledgerHeader = [
      'Agreement & Asset', 'EMI', 'Due Date', 'Amount Paid', 'Status',
      'Rec Date', 'Delay Days', 'Month', 'Delay Interest'
    ];
    const lHeaderRow = worksheet.addRow(ledgerHeader);
    const ledgerHeaderRowNumber = lHeaderRow.number;
    lHeaderRow.height = 25;
    lHeaderRow.eachCell(cell => {
      cell.style = {
        font: { name: 'Segoe UI', bold: true, size: 10, color: { argb: COLORS.WHITE } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY } },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      };
    });

    filteredLoans.forEach(l => {
      l.schedule.forEach(s => {
        const dDate = new Date(s.dueDate);
        const today = new Date();
        const isOver = s.status === 'Pending' && dDate < today;
        const delay = isOver ? Math.floor((today - dDate) / (1000 * 60 * 60 * 24)) : 0;
        const dInterest = isOver ? Math.round(l.emi * 0.18 * (delay / 365)) : 0;

        const row = worksheet.addRow([
          `${l.machineName} / ${l._id.substring(l._id.length - 6).toUpperCase()}`,
          l.emi, s.dueDate, s.status === 'Paid' ? l.emi : 0,
          s.status.toUpperCase(), s.status === 'Paid' ? s.dueDate : '--',
          delay, dDate.toLocaleString('default', { month: 'short' }).toUpperCase(), dInterest
        ]);

        row.height = 18;
        row.eachCell((cell, col) => {
          cell.style = {
            font: { name: 'Segoe UI', size: 9 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
          };
          if (col === 5) {
            cell.font = {
              color: { argb: s.status === 'Paid' ? COLORS.GREEN : COLORS.RED },
              bold: true
            };
          }
          if ([2, 4, 9].includes(col)) cell.numFmt = '#,##0';
        });
      });
    });

    // SET AUTOFILTERS (Classic look with grey buttons)
    worksheet.autoFilter = {
      from: { row: ledgerHeaderRowNumber, column: 1 },
      to: { row: worksheet.lastRow.number, column: 9 }
    };

    // Auto-fit columns
    worksheet.columns.forEach((column, i) => {
      column.width = i === 0 ? 30 : 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${(customer?.name || 'Global').replace(/\s+/g, '_')}_Strategic_Ledger.xlsx`);
    showNotification('Industrial Standard Strategic Report Exported');
  };

  const totalCollected = filteredLoans.reduce((sum, l) => sum + l.schedule.filter(s => s.status === 'Paid').reduce((s, inst) => s + inst.emi, 0), 0);
  const totalEmiAmount = filteredLoans.reduce((sum, l) => sum + (l.emi * l.schedule.length), 0);
  const totalExposure = totalEmiAmount - totalCollected;
  const healthMatrix = Math.round((totalCollected / (totalEmiAmount || 1)) * 100);

  const totalOverdue = filteredLoans.reduce((sum, l) => {
    const overdueSchedule = l.schedule.filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date());
    return sum + overdueSchedule.reduce((s, inst) => s + inst.emi, 0);
  }, 0);

  const totalFutureDues = totalEmiAmount - totalCollected - totalOverdue;
  const totalCyclesCleared = filteredLoans.reduce((sum, l) => sum + l.schedule.filter(s => s.status === 'Paid').length, 0);
  const totalCycles = filteredLoans.reduce((sum, l) => sum + l.schedule.length, 0);

  const lastPayment = payments
    .filter(p => filteredLoans.some(l => l._id === p.loanId?._id || l._id === p.loanId))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const lastPaymentDate = lastPayment ? new Date(lastPayment.date).toLocaleDateString('en-GB') : 'NO PAYMENTS';

  useEffect(() => {
    if (!customer || customer.type === 'FMC') return;

    const ctx = document.getElementById('analyticsChart');
    if (ctx) {
      if (chartRef.current) chartRef.current.destroy();

      const labels = filteredLoans.map(l => l.machineName.split(' ')[0]);
      const collectedData = filteredLoans.map(l => l.schedule.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.emi, 0));
      const pendingData = filteredLoans.map(l => l.schedule.filter(s => s.status === 'Pending').reduce((sum, s) => sum + s.emi, 0));

      if (chartType === 'bar') {
        chartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Cleared', data: collectedData, backgroundColor: '#f0883e', borderRadius: 4, barThickness: 20 },
              { label: 'Backlog', data: pendingData, backgroundColor: '#30363d', borderRadius: 4, barThickness: 20 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { stacked: true, grid: { color: '#30363d' }, ticks: { color: '#768390', font: { size: 9 }, callback: (v) => '₹' + (v / 100000).toFixed(1) + 'L' } },
              x: { stacked: true, grid: { display: false }, ticks: { color: '#768390', font: { size: 9 } } }
            }
          }
        });
      } else if (chartType === 'pie') {
        const totalCleared = collectedData.reduce((a, b) => a + b, 0);
        const totalBacklog = pendingData.reduce((a, b) => a + b, 0);

        chartRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['CLEARED', 'BACKLOG'],
            datasets: [{
              data: [totalCleared, totalBacklog],
              backgroundColor: ['#f0883e', '#30363d'],
              borderColor: '#161b22',
              borderWidth: 4,
              hoverOffset: 10
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (context) => ` ${context.label}: ${formatINR(context.raw)}` } }
            }
          }
        });
      } else {
        // LINE CHART: RECOVERY TREND
        const trendData = payments
          .filter(p => filteredLoans.some(l => l._id === p.loanId?._id || l._id === p.loanId))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        const trendLabels = trendData.map(p => new Date(p.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }));
        const trendValues = trendData.map(p => p.amount);

        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: trendLabels,
            datasets: [{
              label: 'Payment Inflow',
              data: trendValues,
              borderColor: '#f0883e',
              backgroundColor: 'rgba(240, 136, 62, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 2,
              pointBackgroundColor: '#f0883e'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: '#30363d' }, ticks: { color: '#768390', font: { size: 9 }, callback: (v) => '₹' + (v / 1000).toFixed(0) + 'K' } },
              x: { grid: { display: false }, ticks: { color: '#768390', font: { size: 9 } } }
            }
          }
        });
      }
    }

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [customer, filteredLoans, chartType]);

  const dashboardStats = [
    { label: 'RECOVERY', value: formatINR(totalCollected), icon: TrendingUp, color: 'text-[#3fb950]', bg: 'bg-[#3fb950]/10' },
    { label: 'EXPOSURE', value: formatINR(totalExposure), icon: AlertCircle, color: 'text-[#f85149]', bg: 'bg-[#f85149]/10' },
    { label: 'HEALTH MATRIX', value: `${healthMatrix}%`, icon: Activity, color: 'text-[#f0883e]', bg: 'bg-[#f0883e]/10', bar: true, barVal: `${healthMatrix}%` },
    { label: 'FLEET NODE', value: `${filteredLoans.length} Units`, icon: Truck, color: 'text-[#58a6ff]', bg: 'bg-[#58a6ff]/10' },
  ];

  if (!customer) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] opacity-30 text-center space-y-4">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
        <Activity size={32} />
      </div>
      <div>
        <p className="text-sm font-black text-white uppercase tracking-widest">Awaiting Strategic Signal</p>
        <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">Select a customer node to initiate analytics evolution</p>
      </div>
    </div>
  );

  if (customer.type === 'FMC') return <FMCCustomerAnalytics customer={customer} />;

  return (
    <div className="h-full bg-bg-deep text-text-main p-4 flex flex-col overflow-hidden animate-in fade-in duration-500">

      {/* TOP HEADER */}
      <header className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button

            // onClick={() => state.setState({ view: 'customers', selectedCustomerId: null })}
            // className="w-9 h-9 bg-bg-card border border-border-main rounded-xl flex items-center justify-center text-text-dim hover:text-text-main transition-all hover:border-primary/50 shadow-lg"

            onClick={() => { state.setState({ selectedCustomerId: null }); state.goBack(); }}
            className="w-9 h-9 bg-bg-card border border-border-main rounded-xl flex items-center justify-center text-text-dim hover:text-text-main transition-all hover:border-primary/50 shadow-lg"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-text-main tracking-tighter flex items-center gap-3 uppercase italic">
              {customer.name} <span className="text-border-main not-italic">/</span> <span className="text-primary">FLEET NODE</span>
            </h1>
            <p className="text-[9px] font-mono text-text-dim uppercase tracking-[0.3em] mt-1 font-bold">Secure Analytical Terminal // Node_ID: {customer._id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <AssetFilter
            options={machineOptions}
            selected={selectedAsset}
            onSelect={setSelectedAsset}
          />
          <div className="h-6 w-px bg-border-main" />
          <div className="flex items-center gap-3 px-3 py-1.5 bg-bg-active border border-border-main rounded-lg shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse shadow-[0_0_8px_#3fb950]" />
            <span className="text-[9px] font-black text-[#3fb950] font-mono uppercase tracking-widest">Protocol Sync: Active</span>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-0">

        {/* LEFT COLUMN: FINANCIAL PROTOCOLS & LEDGER */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">

          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            {dashboardStats.map((stat, i) => (
              <div key={i} className="bg-bg-card border border-border-main p-5 rounded-2xl group hover:border-text-dim transition-all relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon size={16} />
                  </div>
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-widest font-mono">{stat.label}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl font-mono font-black tracking-tighter ${i === 1 ? 'text-red-500' : 'text-text-main'}`}>
                    {stat.value}
                  </span>
                </div>
                {stat.bar && (
                  <div className="mt-3 h-1 bg-bg-deep rounded-full overflow-hidden border border-border-main">
                    <div className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)]" style={{ width: stat.barVal }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* RECOVERY PROTOCOL STAGES */}
          <div className="bg-bg-card border border-border-main rounded-2xl p-6 shadow-2xl flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-xl active:scale-95"
                >
                  <FileSpreadsheet size={14} /> Export Protocol Ledger
                </button>
                <h2 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2 ml-4">
                  <Calculator size={14} className="text-primary" />
                  Node Reconciliation Matrix
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono text-text-dim">
                <span className="flex items-center gap-1"><Clock size={10} /> Sync Cycle: 09-05-2026</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 shrink-0">
              <StageCard title="STAGE A: RECEIVED" val={formatINR(totalCollected)} sub={`Cycles: ${totalCyclesCleared}/${totalCycles}`} color="text-green-500" border="border-green-500/20" icon={Check} />
              <StageCard title="STAGE B: BALANCE" val={formatINR(totalFutureDues)} sub={`Pending: ${totalCycles - totalCyclesCleared} ${customer.type === 'Rental' ? 'Rentals' : 'EMI'}`} color="text-primary" border="border-primary/20" icon={Zap} />
              <StageCard title="STAGE C: OVERDUE" val={formatINR(totalOverdue)} sub={`Backlog: ${filteredLoans.reduce((sum, l) => sum + l.schedule.filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date()).length, 0)} Units`} color="text-red-500" border="border-red-500/20" icon={AlertCircle} />
              <StageCard title="STAGE D: INTEREST" val={formatINR(totalOverdue * 0.18)} sub="Protocol: Standard 18%" color="text-blue-500" border="border-blue-500/20" icon={History} />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <h3 className="text-[10px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} className="text-primary" /> Active Node Ledger
                </h3>
                <span className="text-[8px] font-mono text-text-dim uppercase font-bold italic">Authorized Strategic Access Only</span>
              </div>
              <div className="flex-1 bg-bg-deep border border-border-main rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-bg-card z-10">
                      <tr className="border-b border-border-main text-[8px] font-black uppercase text-text-dim tracking-widest">
                        <th className="px-5 py-4">Asset Identification</th>
                        <th className="px-5 py-4">Recovery Progress</th>
                        <th className="px-5 py-4">Liability</th>
                        <th className="px-5 py-4 text-red-500">Overdue</th>
                        <th className="px-5 py-4">Next Cycle</th>
                        <th className="px-5 py-4 text-center">Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/30">
                      {filteredLoans.map(l => {
                        const pendingAmount = l.schedule.filter(s => s.status === 'Pending').reduce((sum, s) => sum + s.emi, 0);
                        const paidCount = l.schedule.filter(s => s.status === 'Paid').length;
                        const totalCount = l.schedule.length;
                        const health = (paidCount / totalCount) * 100;
                        const upcomingEmi = l.schedule.find(s => s.status === 'Pending')?.dueDate || 'RESOLVED';

                        return (
                          <tr key={l._id} className="hover:bg-bg-active/30 group cursor-pointer transition-colors" onClick={() => state.setState({ view: 'loan-details', selectedLoanId: l._id, previousView: 'customer-analytics' })}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-bg-card border border-border-main flex items-center justify-center group-hover:border-primary/50 transition-all">
                                  <HardHat size={18} className="text-text-dim group-hover:text-primary" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-text-main uppercase tracking-tight">{l.machineName}</p>
                                  <p className="text-[8px] font-mono text-text-dim uppercase font-bold tracking-widest mt-0.5">NODE_{l._id.substring(l._id.length - 6).toUpperCase()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-20 h-1.5 bg-bg-card border border-border-main rounded-full overflow-hidden">
                                  <div className={`h-full ${health === 100 ? 'bg-[#3fb950]' : 'bg-primary'}`} style={{ width: `${health}%` }} />
                                </div>
                                <span className="text-[9px] font-mono font-black text-text-main">{paidCount}/{totalCount}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-[11px] font-mono font-black text-text-main">{formatINR(pendingAmount)}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-[11px] font-mono font-black text-red-500">
                                {formatINR(l.schedule.filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date()).reduce((s, inst) => s + inst.emi, 0))}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-[10px] font-mono font-black text-primary uppercase">{upcomingEmi}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); showNotification(`Initiating Sync for ${l.machineName}...`); }}
                                  className="p-2 hover:bg-primary/10 rounded-lg text-text-dim hover:text-primary transition-all border border-transparent hover:border-primary/30"
                                  title="Sync Asset Matrix"
                                >
                                  <Activity size={14} />
                                </button>

                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const isOverdue = l.schedule.some(s => s.status === 'Pending' && new Date(s.dueDate) < new Date());
                                    showNotification(isOverdue ? `Sending Overdue Notice for ${l.machineName}...` : `Sending Payment Reminder for ${l.machineName}...`, 'info');
                                    const res = await state.sendOverdueNotice(l._id);
                                    if (res.success) showNotification('Notice Dispatched Successfully', 'success');
                                    else showNotification(res.message, 'error');
                                  }}
                                  className={`p-2 rounded-lg transition-all border ${l.schedule.some(s => s.status === 'Pending' && new Date(s.dueDate) < new Date())
                                    ? 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/20'
                                    : 'bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white border-blue-500/20'
                                    }`}
                                  title={l.schedule.some(s => s.status === 'Pending' && new Date(s.dueDate) < new Date()) ? "Send Overdue Notice" : "Send Payment Reminder"}
                                >
                                  <Mail size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ANALYTICAL NODES */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1 min-h-0">

          {/* INSIGHTS CHART */}
          <section className="bg-bg-card border border-border-main rounded-3xl p-6 flex flex-col shrink-0 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Collection Insights</h3>
              <div className="flex p-1 bg-bg-deep border border-border-main rounded-xl shadow-inner">
                {[
                  { id: 'bar', icon: BarChart3 },
                  { id: 'pie', icon: PieIcon },
                  { id: 'line', icon: LineIcon }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`p-2 rounded-lg transition-all ${chartType === type.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-dim hover:text-text-main'}`}
                  >
                    <type.icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[240px] relative px-2">
              <canvas id="analyticsChart"></canvas>
              {chartType === 'pie' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-6">
                  <div className="text-center">
                    <p className="text-xl font-black text-white font-mono leading-none">{healthMatrix}%</p>
                    <p className="text-[8px] font-black text-[#444c56] uppercase tracking-[0.2em] mt-1">HEALTH</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 bg-bg-deep rounded-2xl border border-border-main hover:border-[#3fb950]/30 transition-all group">
                <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 group-hover:text-[#3fb950] transition-colors">CLEARED ASSETS</p>
                <p className="text-sm font-mono font-black text-text-main">{formatINR(totalCollected)}</p>
              </div>
              <div className="p-4 bg-bg-deep rounded-2xl border border-border-main hover:border-[#f85149]/30 transition-all group">
                <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 group-hover:text-[#f85149] transition-colors">REMAINING EXPOSURE</p>
                <p className="text-sm font-mono font-black text-[#f85149]">{formatINR(totalExposure)}</p>
              </div>
            </div>
          </section>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }
      `}} />
    </div>
  );
};

export default CustomerAnalytics;

