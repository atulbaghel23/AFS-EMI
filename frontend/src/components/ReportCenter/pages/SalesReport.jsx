import React, { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { formatINR } from "../../../utils";
import { StatCard } from "../../ORMDashboard";
import { Banknote, Wallet, Receipt, AlertCircle, Search, FileText } from "lucide-react";

const SalesReport = forwardRef(({ customers = [], loans = [], globalFilters, scrollContainerRef, isDragging, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove }, ref) => {
  const realSales = useMemo(() => {
    return loans.map((l) => {
      const custId = l.customerId?._id || l.customerId;
      const c = customers.find((cust) => cust._id === custId) || {};

      const machinePrice = Number(l.machinePrice) || Number(l.principal) || 0;
      const downPayment = Number(l.downPayment) || 0;

      const isOverdue = l.schedule?.some(
        (s) => s.status !== "Paid" && new Date(s.dueDate) < new Date(),
      );
      let emiStatus = l.status || "Active";
      if (isOverdue) emiStatus = "Overdue";

      let saleDateStr = l.startDate || l.emiStartDate;
      if (!saleDateStr && l.createdAt) {
        const createdAtDate = new Date(l.createdAt);
        saleDateStr = !isNaN(createdAtDate.getTime()) ? createdAtDate.toISOString().split("T")[0] : "";
      }
      if (!saleDateStr) saleDateStr = new Date().toISOString().split("T")[0];

      try {
        if (saleDateStr.includes("/")) {
          const [d, m, y] = saleDateStr.split("/");
          if (d.length === 2 && y.length === 4) saleDateStr = `${y}-${m}-${d}`;
        }
      } catch (e) {}

      return {
        id:
          l.invoiceNumber ||
          (l._id ? `INV-${l._id.toString().slice(-6).toUpperCase()}` : "UNK"),
        customer: c.name || "Unknown",
        machine: l.machineName || l.model || "Unknown Machine",
        salesExec: c.salesExec || "System Auto",
        saleDate: saleDateStr,
        downPayment: downPayment,
        totalValue: machinePrice,
        emiStatus: emiStatus,
        financeProvider: "In-House Finance",
        overdue: !!isOverdue,
      };
    });
  }, [loans, customers]);

  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilters, setSalesFilters] = useState({
    customer: "All Customers",
    machine: "All Machines",
    salesExec: "All Executives",
    saleDate: "All Dates",
    downPayment: "All Ranges",
    emiStatus: "All Statuses",
    financeProvider: "All Providers",
  });

  const salesCustomers = ["All Customers", ...new Set(realSales.map((s) => s.customer))];
  const salesMachines = ["All Machines", ...new Set(realSales.map((s) => s.machine))];
  const salesExecs = ["All Executives", ...new Set(realSales.map((s) => s.salesExec))];
  const salesDates = ["All Dates", ...new Set(realSales.map((s) => s.saleDate.substring(0, 7)))].sort().reverse();
  const downPaymentRanges = ["All Ranges", "< 5L", "5L - 10L", "> 10L"];
  const salesEmiStatuses = ["All Statuses", ...new Set(realSales.map((s) => s.emiStatus))];
  const financeProviders = ["All Providers", ...new Set(realSales.map((s) => s.financeProvider))];

  const filteredSales = realSales.filter((s) => {
    const matchesSearch = s.id.toLowerCase().includes(salesSearch.toLowerCase());
    const matchesCustomer = salesFilters.customer === "All Customers" || s.customer === salesFilters.customer;
    const matchesMachine = salesFilters.machine === "All Machines" || s.machine === salesFilters.machine;
    const matchesExec = salesFilters.salesExec === "All Executives" || s.salesExec === salesFilters.salesExec;
    const matchesDate = salesFilters.saleDate === "All Dates" || s.saleDate.startsWith(salesFilters.saleDate);
    const matchesStatus = salesFilters.emiStatus === "All Statuses" || s.emiStatus === salesFilters.emiStatus;
    const matchesProvider = salesFilters.financeProvider === "All Providers" || s.financeProvider === salesFilters.financeProvider;

    let matchesDP = true;
    if (salesFilters.downPayment === "< 5L") matchesDP = s.downPayment < 500000;
    if (salesFilters.downPayment === "5L - 10L") matchesDP = s.downPayment >= 500000 && s.downPayment <= 1000000;
    if (salesFilters.downPayment === "> 10L") matchesDP = s.downPayment > 1000000;

    // Global sidebar filters
    let matchesGlobal = true;
    if (globalFilters) {
      // Date range on sale date
      if (globalFilters.date.from && s.saleDate < globalFilters.date.from) matchesGlobal = false;
      if (globalFilters.date.to && s.saleDate > globalFilters.date.to) matchesGlobal = false;
      // Customer name search
      if (globalFilters.customer.name && !s.customer.toLowerCase().includes(globalFilters.customer.name.toLowerCase())) matchesGlobal = false;
      // Down payment financial range from sidebar
      if (globalFilters.financial.downPayment.min && s.downPayment < Number(globalFilters.financial.downPayment.min)) matchesGlobal = false;
      if (globalFilters.financial.downPayment.max && s.downPayment > Number(globalFilters.financial.downPayment.max)) matchesGlobal = false;
      // EMI amount maps to totalValue here
      if (globalFilters.financial.emi.min && s.totalValue < Number(globalFilters.financial.emi.min)) matchesGlobal = false;
      if (globalFilters.financial.emi.max && s.totalValue > Number(globalFilters.financial.emi.max)) matchesGlobal = false;
      // Status array filter
      if (globalFilters.status.length > 0 && !globalFilters.status.includes(s.emiStatus)) matchesGlobal = false;
    }

    return matchesSearch && matchesCustomer && matchesMachine && matchesExec && matchesDate && matchesStatus && matchesProvider && matchesDP && matchesGlobal;
  });

  const totalSalesCount = filteredSales.length;
  const totalSalesValue = filteredSales.reduce((sum, s) => sum + s.totalValue, 0);
  const avgDownPayment = totalSalesCount > 0 ? filteredSales.reduce((sum, s) => sum + s.downPayment, 0) / totalSalesCount : 0;
  const activeEMIAccounts = filteredSales.filter((s) => s.emiStatus === "Active").length;
  const overdueEMIAccounts = filteredSales.filter((s) => s.overdue).length;

  const handleSalesFilterChange = (key, value) => {
    setSalesFilters((prev) => ({ ...prev, [key]: value }));
  };

  useImperativeHandle(ref, () => ({
    exportCSV: () => {
      const headers = ["ID", "Customer", "Machine", "Exec", "Date", "Down Payment", "Total Value", "Status", "Provider"];
      const dataToExport = filteredSales.map(s => [s.id, s.customer, s.machine, s.salesExec, s.saleDate, s.downPayment, s.totalValue, s.emiStatus, s.financeProvider]);
      return { headers, data: dataToExport, fileName: 'Sales_Reports' };
    }
  }));

  return (
    <div className="flex flex-col gap-6 min-h-0 h-full flex-1 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <StatCard icon={Banknote} label="TOTAL SALES VALUE" value={formatINR(totalSalesValue)} accent="text-primary" />
        <StatCard icon={Wallet} label="AVG DOWN PAYMENT" value={formatINR(avgDownPayment)} accent="text-blue-500" />
        <StatCard icon={Receipt} label="ACTIVE EMI A/C" value={activeEMIAccounts} accent="text-green-500" />
        <StatCard icon={AlertCircle} label="OVERDUE EMI A/C" value={overdueEMIAccounts} accent="text-red-500" />
      </div>

      <div className="flex-1 bg-bg-card border border-border-main rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={14} className="text-primary" /> SALES REPORTS DATA
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search records..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="bg-bg-deep border border-border-main rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pb-2 pt-1">
            <select value={salesFilters.customer} onChange={(e) => handleSalesFilterChange("customer", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {salesCustomers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={salesFilters.machine} onChange={(e) => handleSalesFilterChange("machine", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {salesMachines.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={salesFilters.salesExec} onChange={(e) => handleSalesFilterChange("salesExec", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {salesExecs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={salesFilters.saleDate} onChange={(e) => handleSalesFilterChange("saleDate", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {salesDates.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={salesFilters.downPayment} onChange={(e) => handleSalesFilterChange("downPayment", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {downPaymentRanges.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={salesFilters.emiStatus} onChange={(e) => handleSalesFilterChange("emiStatus", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {salesEmiStatuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={salesFilters.financeProvider} onChange={(e) => handleSalesFilterChange("financeProvider", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {financeProviders.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer & Machine</th>
                <th className="px-6 py-4">Sale Date</th>
                <th className="px-6 py-4">Sales Exec</th>
                <th className="px-6 py-4">Finance Info</th>
                <th className="px-6 py-4 text-right">Down Payment</th>
                <th className="px-6 py-4 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/30">
              {filteredSales.map((row) => (
                <tr key={row.id} className="hover:bg-bg-active transition-colors group cursor-pointer">
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.customer}</div>
                    <div className="text-[9px] text-text-dim">{row.machine}</div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-text-dim">{row.saleDate}</td>
                  <td className="px-6 py-4 text-[11px] text-text-dim">{row.salesExec}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.financeProvider}</div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border mt-1 inline-block ${row.emiStatus === "Active" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : row.emiStatus === "Completed" ? "bg-green-500/10 text-green-500 border-green-500/20" : row.emiStatus === "Overdue" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                      {row.emiStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-text-main text-right">{formatINR(row.downPayment)}</td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-text-main text-right">{formatINR(row.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default SalesReport;
