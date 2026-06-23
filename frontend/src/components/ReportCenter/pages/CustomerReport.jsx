import React, { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { formatINR } from "../../../utils";
import { StatCard } from "../../ORMDashboard";
import {
  Users,
  UserCheck,
  Briefcase,
  AlertCircle,
  Repeat,
  Search,
  FileText,
} from "lucide-react";

const CustomerReport = forwardRef(({ customers = [], loans = [], payments = [], globalFilters, scrollContainerRef, isDragging, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove }, ref) => {
  const realCustomers = useMemo(() => {
    return customers.map((c) => {
      const customerLoans = loans.filter(
        (l) => (l.customerId?._id || l.customerId) === c._id,
      );
      const lifetimeValue = customerLoans.reduce(
        (sum, l) => sum + (Number(l.totalCost) || Number(l.amount) || 0),
        0,
      );

      const customerLoanIds = customerLoans.map((l) => l._id.toString());
      const customerPayments = payments.filter((p) => {
        const loanIdStr = (p.loanId?._id || p.loanId)?.toString();
        return customerLoanIds.includes(loanIdStr);
      });
      const totalPaid = customerPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );
      const outstanding = Math.max(0, lifetimeValue - totalPaid);

      return {
        id: c.customId || (c._id ? c._id.toString().slice(-6).toUpperCase() : "UNK"),
        name: c.name || "Unknown",
        type: c.type || "Corporate",
        industry: c.company || c.industry || "General",
        location: c.city || "Not Specified",
        salesExec: c.salesExec || "System Auto",
        status: c.status || "Active",
        lifetimeValue,
        outstanding,
        repeatRentals: customerLoans.length,
      };
    });
  }, [customers, loans, payments]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilters, setCustomerFilters] = useState({
    type: "All Types",
    industry: "All Industries",
    location: "All Locations",
    salesExec: "All Executives",
    status: "All Statuses",
    revenue: "All Revenue",
  });

  const custTypes = ["All Types", ...new Set(realCustomers.map((c) => c.type))];
  const custIndustries = ["All Industries", ...new Set(realCustomers.map((c) => c.industry))];
  const custLocations = ["All Locations", ...new Set(realCustomers.map((c) => c.location))];
  const custExecs = ["All Executives", ...new Set(realCustomers.map((c) => c.salesExec))];
  const custStatuses = ["All Statuses", ...new Set(realCustomers.map((c) => c.status))];
  const revenueRanges = ["All Revenue", "< 1 Cr", "1 Cr - 5 Cr", "> 5 Cr"];

  const filteredCustomers = realCustomers.filter((c) => {
    const matchesSearch = c.id.toLowerCase().includes(customerSearch.toLowerCase()) || c.name.toLowerCase().includes(customerSearch.toLowerCase());
    const matchesType = customerFilters.type === "All Types" || c.type === customerFilters.type;
    const matchesIndustry = customerFilters.industry === "All Industries" || c.industry === customerFilters.industry;
    const matchesLocation = customerFilters.location === "All Locations" || c.location === customerFilters.location;
    const matchesExec = customerFilters.salesExec === "All Executives" || c.salesExec === customerFilters.salesExec;
    const matchesStatus = customerFilters.status === "All Statuses" || c.status === customerFilters.status;

    let matchesRev = true;
    if (customerFilters.revenue === "< 1 Cr") matchesRev = c.lifetimeValue < 10000000;
    if (customerFilters.revenue === "1 Cr - 5 Cr") matchesRev = c.lifetimeValue >= 10000000 && c.lifetimeValue <= 50000000;
    if (customerFilters.revenue === "> 5 Cr") matchesRev = c.lifetimeValue > 50000000;

    // Global sidebar filters
    let matchesGlobal = true;
    if (globalFilters) {
      if (globalFilters.customer.name && !c.name.toLowerCase().includes(globalFilters.customer.name.toLowerCase())) matchesGlobal = false;
      if (globalFilters.customer.type && c.type !== globalFilters.customer.type) matchesGlobal = false;
      if (globalFilters.financial.outstanding.min && c.outstanding < Number(globalFilters.financial.outstanding.min)) matchesGlobal = false;
      if (globalFilters.financial.outstanding.max && c.outstanding > Number(globalFilters.financial.outstanding.max)) matchesGlobal = false;
    }

    return matchesSearch && matchesType && matchesIndustry && matchesLocation && matchesExec && matchesStatus && matchesRev && matchesGlobal;
  });

  const totalCustomers = filteredCustomers.length;
  const activeCustomers = filteredCustomers.filter((c) => c.status === "Active").length;
  const totalCLV = filteredCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0);
  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + c.outstanding, 0);
  const totalRepeatRentals = filteredCustomers.reduce((sum, c) => sum + c.repeatRentals, 0);

  const handleCustomerFilterChange = (key, value) => {
    setCustomerFilters((prev) => ({ ...prev, [key]: value }));
  };

  useImperativeHandle(ref, () => ({
    exportCSV: () => {
      const headers = ["ID", "Name", "Type", "Industry", "Location", "Exec", "Status", "LTV", "Outstanding"];
      const dataToExport = filteredCustomers.map(c => [c.id, c.name, c.type, c.industry, c.location, c.salesExec, c.status, c.lifetimeValue, c.outstanding]);
      return { headers, data: dataToExport, fileName: 'Customer_Reports' };
    }
  }));

  return (
    <div className="flex flex-col gap-6 min-h-0 h-full flex-1 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 shrink-0">
        <StatCard icon={Users} label="TOTAL CUSTOMERS" value={totalCustomers} accent="text-primary" />
        <StatCard icon={UserCheck} label="ACTIVE CUSTOMERS" value={activeCustomers} accent="text-green-500" />
        <StatCard icon={Briefcase} label="LIFETIME VALUE" value={formatINR(totalCLV)} accent="text-blue-500" />
        <StatCard icon={AlertCircle} label="OUTSTANDING BAL" value={formatINR(totalOutstanding)} accent="text-red-500" />
        <StatCard icon={Repeat} label="REPEAT RENTALS" value={totalRepeatRentals} accent="text-indigo-500" />
      </div>

      <div className="flex-1 bg-bg-card border border-border-main rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={14} className="text-primary" /> CUSTOMER REPORTS DATA
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search records..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="bg-bg-deep border border-border-main rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pb-2 pt-1">
            <select value={customerFilters.type} onChange={(e) => handleCustomerFilterChange("type", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {custTypes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={customerFilters.industry} onChange={(e) => handleCustomerFilterChange("industry", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {custIndustries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={customerFilters.location} onChange={(e) => handleCustomerFilterChange("location", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {custLocations.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={customerFilters.salesExec} onChange={(e) => handleCustomerFilterChange("salesExec", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {custExecs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={customerFilters.status} onChange={(e) => handleCustomerFilterChange("status", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {custStatuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={customerFilters.revenue} onChange={(e) => handleCustomerFilterChange("revenue", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {revenueRanges.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="px-6 py-4">Customer ID</th>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Sales Exec</th>
                <th className="px-6 py-4 text-center">Repeat Rentals</th>
                <th className="px-6 py-4 text-right">Outstanding</th>
                <th className="px-6 py-4 text-right">LTV (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/30">
              {filteredCustomers.map((row) => (
                <tr key={row.id} className="hover:bg-bg-active transition-colors group cursor-pointer">
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.name}</div>
                    <div className="text-[9px] text-text-dim">{row.type} • {row.location}</div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-text-dim">{row.industry}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${row.status === "Active" ? "bg-green-500/10 text-green-500 border-green-500/20" : row.status === "At Risk" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-text-dim/10 text-text-dim border-border-main"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-text-dim">{row.salesExec}</td>
                  <td className="px-6 py-4 text-center text-[11px] font-mono">{row.repeatRentals}</td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-red-400 text-right">{row.outstanding > 0 ? formatINR(row.outstanding) : "-"}</td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-text-main text-right">{formatINR(row.lifetimeValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default CustomerReport;
