import React, { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { formatINR } from "../../../utils";
import { StatCard } from "../../ORMDashboard";
import { Banknote, Wallet, AlertCircle, TrendingUp, Search, FileText } from "lucide-react";

const EMIPaymentReport = forwardRef(({ customers = [], loans = [], payments = [], globalFilters, scrollContainerRef, isDragging, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove }, ref) => {
  const realEMIs = useMemo(() => {
    if (payments.length > 0) {
      return payments.map(p => {
        const c = customers.find(cust => cust._id === (p.customerId?._id || p.customerId)) || {};
        const l = loans.find(loan => loan._id === (p.loanId?._id || p.loanId)) || {};
        
        return {
          id: p.invoiceNumber || (p._id ? `EMI-${p._id.toString().slice(-6).toUpperCase()}` : 'UNK'),
          customer: c.name || 'Unknown',
          machine: l.machineName || l.model || 'Unknown Machine',
          status: p.status || 'Pending',
          dueDate: (p.paymentDate || new Date().toISOString()).split('T')[0],
          paymentMethod: p.paymentMethod || 'Bank Transfer',
          provider: 'Bank',
          collected: p.status === 'Paid' || p.status === 'Completed' ? (p.amount || 0) : 0,
          outstanding: l.principal || 0,
          overdueAmount: p.status === 'Overdue' ? (p.amount || 0) : 0,
        };
      });
    }

    return loans.map(l => {
      const custId = l.customerId?._id || l.customerId;
      const c = customers.find(cust => cust._id === custId) || {};
      
      const dueDate = new Date();
      dueDate.setDate(5);
      if (dueDate < new Date()) {
          dueDate.setMonth(dueDate.getMonth() + 1);
      }
      
      let status = 'Pending';
      if (l.status === 'Closed' || l.status === 'Completed') status = 'Paid';
      
      return {
        id: `EMI-${l._id?.toString().slice(-6).toUpperCase() || 'UNK'}`,
        customer: c.name || 'Unknown',
        machine: l.machineName || l.model || 'Unknown Machine',
        status: status,
        dueDate: !isNaN(dueDate.getTime()) ? dueDate.toISOString().split('T')[0] : '',
        paymentMethod: 'Auto Debit',
        provider: 'N/A',
        collected: l.downPayment || 0,
        outstanding: l.principal || 0,
        overdueAmount: 0
      };
    });
  }, [loans, customers, payments]);

  const [emiSearch, setEmiSearch] = useState("");
  const [emiFilters, setEmiFilters] = useState({
    customer: "All Customers",
    machine: "All Machines",
    status: "All Statuses",
    paymentMethod: "All Methods",
    provider: "All Providers",
  });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const emiCustomers = ["All Customers", ...new Set(realEMIs.map((e) => e.customer))];
  const emiMachines = ["All Machines", ...new Set(realEMIs.map((e) => e.machine))];
  const emiStatuses = ["All Statuses", ...new Set(realEMIs.map((e) => e.status))];
  const emiMethods = ["All Methods", ...new Set(realEMIs.map((e) => e.paymentMethod))];
  const emiProviders = ["All Providers", ...new Set(realEMIs.map((e) => e.provider))];

  const filteredEMIs = realEMIs.filter((e) => {
    // Basic Filters
    const matchesSearch = e.id.toLowerCase().includes(emiSearch.toLowerCase());
    const matchesCustomer = emiFilters.customer === "All Customers" || e.customer === emiFilters.customer;
    const matchesMachine = emiFilters.machine === "All Machines" || e.machine === emiFilters.machine;
    const matchesStatus = emiFilters.status === "All Statuses" || e.status === emiFilters.status;
    const matchesMethod = emiFilters.paymentMethod === "All Methods" || e.paymentMethod === emiFilters.paymentMethod;
    const matchesProvider = emiFilters.provider === "All Providers" || e.provider === emiFilters.provider;
    
    // Custom inline date filter (kept for local override if any)
    let matchesCustomDate = true;
    if (dateRange.start) matchesCustomDate = e.dueDate >= dateRange.start;
    if (dateRange.end && matchesCustomDate) matchesCustomDate = e.dueDate <= dateRange.end;

    // Global Filters logic
    let matchesGlobal = true;
    if (globalFilters) {
      // Date Filter
      if (globalFilters.date.from && e.dueDate < globalFilters.date.from) matchesGlobal = false;
      if (globalFilters.date.to && e.dueDate > globalFilters.date.to) matchesGlobal = false;

      // Status Filter
      if (globalFilters.status.length > 0) {
        if (!globalFilters.status.includes(e.status)) matchesGlobal = false;
      }

      // Customer name search
      if (globalFilters.customer.name && !e.customer.toLowerCase().includes(globalFilters.customer.name.toLowerCase())) matchesGlobal = false;

      // Financial (Outstanding)
      if (globalFilters.financial.outstanding.min && e.outstanding < Number(globalFilters.financial.outstanding.min)) matchesGlobal = false;
      if (globalFilters.financial.outstanding.max && e.outstanding > Number(globalFilters.financial.outstanding.max)) matchesGlobal = false;
      
      // Since realEMIs doesn't have down payment mapped accurately here for payments, we only filter outstanding for now.
    }

    return matchesSearch && matchesCustomer && matchesMachine && matchesStatus && matchesCustomDate && matchesMethod && matchesProvider && matchesGlobal;
  });

  const emiCollected = filteredEMIs.reduce((sum, e) => sum + e.collected, 0);
  const emiOutstanding = filteredEMIs.reduce((sum, e) => sum + e.outstanding, 0);
  const emiOverdue = filteredEMIs.reduce((sum, e) => sum + e.overdueAmount, 0);
  const emiTotalDue = emiCollected + emiOverdue; // mock for rate calculation
  const emiCollectionRate = emiTotalDue > 0 ? Math.round((emiCollected / emiTotalDue) * 100) : 0;

  const handleEmiFilterChange = (key, value) => {
    setEmiFilters((prev) => ({ ...prev, [key]: value }));
  };

  useImperativeHandle(ref, () => ({
    exportCSV: () => {
      const headers = ["ID", "Customer", "Machine", "Status", "Due Date", "Method", "Provider", "Collected", "Outstanding", "Overdue"];
      const dataToExport = filteredEMIs.map(e => [e.id, e.customer, e.machine, e.status, e.dueDate, e.paymentMethod, e.provider, e.collected, e.outstanding, e.overdueAmount]);
      return { headers, data: dataToExport, fileName: 'EMI_Payment_Reports' };
    },
    setFilters: (filters) => {
      setEmiFilters(prev => ({ ...prev, ...filters }));
    },
    setSearch: (term) => {
      setEmiSearch(term);
    }
  }));

  return (
    <div className="flex flex-col gap-6 min-h-0 shrink-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <StatCard icon={Banknote} label="EMI COLLECTED" value={formatINR(emiCollected)} accent="text-green-500" />
        <StatCard icon={Wallet} label="OUTSTANDING BAL" value={formatINR(emiOutstanding)} accent="text-blue-500" />
        <StatCard icon={AlertCircle} label="OVERDUE AMOUNT" value={formatINR(emiOverdue)} accent="text-red-500" />
        <StatCard icon={TrendingUp} label="COLLECTION RATE" value={`${emiCollectionRate}%`} accent="text-primary" />
      </div>

      <div className="flex-1 bg-bg-card border border-border-main rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={14} className="text-primary" /> EMI & PAYMENT REPORTS DATA
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search records..."
                value={emiSearch}
                onChange={(e) => setEmiSearch(e.target.value)}
                className="bg-bg-deep border border-border-main rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pb-2 pt-1">
            <div className="flex items-center gap-2 bg-bg-deep border border-border-main rounded px-2 py-1 shrink-0">
              <span className="text-[10px] text-text-dim font-bold">FROM:</span>
              <input
                type="date"
                className="bg-transparent text-[10px] text-text-main focus:outline-none"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="text-[10px] text-text-dim font-bold ml-2">TO:</span>
              <input
                type="date"
                className="bg-transparent text-[10px] text-text-main focus:outline-none"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <select value={emiFilters.customer} onChange={(e) => handleEmiFilterChange("customer", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {emiCustomers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={emiFilters.machine} onChange={(e) => handleEmiFilterChange("machine", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {emiMachines.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={emiFilters.status} onChange={(e) => handleEmiFilterChange("status", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {emiStatuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={emiFilters.paymentMethod} onChange={(e) => handleEmiFilterChange("paymentMethod", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {emiMethods.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={emiFilters.provider} onChange={(e) => handleEmiFilterChange("provider", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {emiProviders.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className={`flex-1 w-full max-w-full overflow-x-auto overflow-y-auto custom-scrollbar ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-bg-deep z-10">
              <tr className="border-b border-border-main text-[9px] font-bold text-text-dim uppercase tracking-widest">
                <th className="px-6 py-4">EMI ID</th>
                <th className="px-6 py-4">Customer & Machine</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Payment Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Outstanding</th>
                <th className="px-6 py-4 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/30">
              {filteredEMIs.map((row) => (
                <tr key={row.id} className="hover:bg-bg-active transition-colors group cursor-pointer">
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.customer}</div>
                    <div className="text-[9px] text-text-dim">{row.machine}</div>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.dueDate}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-text-main">{row.paymentMethod}</div>
                    <div className="text-[9px] text-text-dim">{row.provider}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${row.status === "Paid" || row.status === "Completed" ? "bg-green-500/10 text-green-500 border-green-500/20" : row.status === "Pending" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-text-main text-right">{formatINR(row.outstanding)}</td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-red-400 text-right">{row.overdueAmount > 0 ? formatINR(row.overdueAmount) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default EMIPaymentReport;
