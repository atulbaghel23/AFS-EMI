import React, { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { formatINR } from "../../../utils";
import { StatCard } from "../../ORMDashboard";
import { FileCheck, Banknote, HardHat, Timer, Search, FileText } from "lucide-react";

const ContractReport = forwardRef(({ customers = [], loans = [], globalFilters, scrollContainerRef, isDragging, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove }, ref) => {
  const realContracts = useMemo(() => {
    return customers.map(c => {
      const customerLoans = loans.filter(l => (l.customerId?._id || l.customerId) === c._id);
      
      if (customerLoans.length === 0) return null;
      
      const revenue = customerLoans.reduce((sum, l) => sum + (l.principal || l.machinePrice || 0), 0);
      const machinesAllocated = customerLoans.length;
      
      const firstLoan = customerLoans[0];
      let startDateStr = firstLoan.startDate || firstLoan.emiStartDate || new Date().toISOString().split('T')[0];
      try {
        if (startDateStr.includes('/')) {
          const [d, m, y] = startDateStr.split('/');
          if (d.length === 2 && y.length === 4) startDateStr = `${y}-${m}-${d}`;
        }
      } catch (e) {}

      const tenure = firstLoan.tenure || 12; // months
      const endDate = new Date(startDateStr);
      if(!isNaN(endDate.getTime())) {
          endDate.setMonth(endDate.getMonth() + tenure);
      }
      
      const expiringInDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      let status = 'Active';
      if (expiringInDays < 0) status = 'Completed';
      
      return {
        id: `CTR-${c._id.toString().slice(-6).toUpperCase()}`,
        type: customerLoans.length > 2 ? 'Time & Material' : 'Fixed Price',
        customer: c.name || 'Unknown',
        projectName: c.companyName || `${c.name} Project`,
        location: c.city || 'HQ',
        status: status,
        startDate: startDateStr,
        endDate: !isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : '',
        machinesAllocated: machinesAllocated,
        revenue: Number(revenue),
        expiringInDays: isNaN(expiringInDays) ? 0 : expiringInDays
      };
    }).filter(Boolean);
  }, [loans, customers]);

  const [contractSearch, setContractSearch] = useState("");
  const [contractFilters, setContractFilters] = useState({
    type: "All Types",
    customer: "All Customers",
    projectName: "All Projects",
    status: "All Statuses",
    location: "All Locations",
    startDate: "All Dates",
    endDate: "All Dates",
  });

  const contractTypes = ["All Types", ...new Set(realContracts.map((c) => c.type))];
  const contractCustomers = ["All Customers", ...new Set(realContracts.map((c) => c.customer))];
  const contractProjects = ["All Projects", ...new Set(realContracts.map((c) => c.projectName))];
  const contractStatuses = ["All Statuses", ...new Set(realContracts.map((c) => c.status))];
  const contractLocations = ["All Locations", ...new Set(realContracts.map((c) => c.location))];
  const contractStartDates = ["All Dates", ...new Set(realContracts.map((c) => c.startDate.substring(0, 7)))].sort().reverse();
  const contractEndDates = ["All Dates", ...new Set(realContracts.map((c) => c.endDate.substring(0, 7)))].sort().reverse();

  const filteredContracts = realContracts.filter((c) => {
    const matchesSearch = c.id.toLowerCase().includes(contractSearch.toLowerCase()) || c.projectName.toLowerCase().includes(contractSearch.toLowerCase());
    const matchesType = contractFilters.type === "All Types" || c.type === contractFilters.type;
    const matchesCustomer = contractFilters.customer === "All Customers" || c.customer === contractFilters.customer;
    const matchesProject = contractFilters.projectName === "All Projects" || c.projectName === contractFilters.projectName;
    const matchesStatus = contractFilters.status === "All Statuses" || c.status === contractFilters.status;
    const matchesLocation = contractFilters.location === "All Locations" || c.location === contractFilters.location;
    const matchesStart = contractFilters.startDate === "All Dates" || c.startDate.startsWith(contractFilters.startDate);
    const matchesEnd = contractFilters.endDate === "All Dates" || c.endDate.startsWith(contractFilters.endDate);

    // Global sidebar filters
    let matchesGlobal = true;
    if (globalFilters) {
      // Date range on contract start date
      if (globalFilters.date.from && c.startDate < globalFilters.date.from) matchesGlobal = false;
      if (globalFilters.date.to && c.startDate > globalFilters.date.to) matchesGlobal = false;
      // Customer name search
      if (globalFilters.customer.name && !c.customer.toLowerCase().includes(globalFilters.customer.name.toLowerCase())) matchesGlobal = false;
      // Status filter
      if (globalFilters.status.length > 0 && !globalFilters.status.includes(c.status)) matchesGlobal = false;
      // Financial – outstanding maps to revenue for contracts
      if (globalFilters.financial.outstanding.min && c.revenue < Number(globalFilters.financial.outstanding.min)) matchesGlobal = false;
      if (globalFilters.financial.outstanding.max && c.revenue > Number(globalFilters.financial.outstanding.max)) matchesGlobal = false;
    }

    return matchesSearch && matchesType && matchesCustomer && matchesProject && matchesStatus && matchesLocation && matchesStart && matchesEnd && matchesGlobal;
  });

  const activeContractsCount = filteredContracts.filter((c) => c.status === "Active").length;
  const contractRevenueValue = filteredContracts.reduce((sum, c) => sum + c.revenue, 0);
  const totalMachineAllocation = filteredContracts.reduce((sum, c) => sum + c.machinesAllocated, 0);
  const expiringContractsCount = filteredContracts.filter((c) => c.expiringInDays > 0 && c.expiringInDays <= 90).length;

  const handleContractFilterChange = (key, value) => {
    setContractFilters((prev) => ({ ...prev, [key]: value }));
  };

  useImperativeHandle(ref, () => ({
    exportCSV: () => {
      const headers = ["ID", "Type", "Customer", "Project", "Location", "Status", "Start", "End", "Machines", "Revenue"];
      const dataToExport = filteredContracts.map(c => [c.id, c.type, c.customer, c.projectName, c.location, c.status, c.startDate, c.endDate, c.machinesAllocated, c.revenue]);
      return { headers, data: dataToExport, fileName: 'Contract_Reports' };
    },
    setFilters: (filters) => {
      setContractFilters(prev => ({ ...prev, ...filters }));
    },
    setSearch: (term) => {
      setContractSearch(term);
    }
  }));

  return (
    <div className="flex flex-col gap-6 min-h-0 h-full flex-1 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <StatCard icon={FileCheck} label="ACTIVE CONTRACTS" value={activeContractsCount} accent="text-blue-500" />
        <StatCard icon={Banknote} label="CONTRACT REVENUE" value={formatINR(contractRevenueValue)} accent="text-green-500" />
        <StatCard icon={HardHat} label="MACHINE ALLOCATION" value={totalMachineAllocation} accent="text-primary" />
        <StatCard icon={Timer} label="EXPIRING (< 90D)" value={expiringContractsCount} accent="text-red-500" />
      </div>

      <div className="flex-1 bg-bg-card border border-border-main rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={14} className="text-primary" /> CONTRACT REPORTS DATA
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search records..."
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="bg-bg-deep border border-border-main rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pb-2 pt-1">
            <select value={contractFilters.type} onChange={(e) => handleContractFilterChange("type", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {contractTypes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={contractFilters.customer} onChange={(e) => handleContractFilterChange("customer", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {contractCustomers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={contractFilters.projectName} onChange={(e) => handleContractFilterChange("projectName", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {contractProjects.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={contractFilters.status} onChange={(e) => handleContractFilterChange("status", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {contractStatuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={contractFilters.startDate} onChange={(e) => handleContractFilterChange("startDate", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              <option value="All Dates">Start Date: All</option>
              {contractStartDates.filter((d) => d !== "All Dates").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={contractFilters.endDate} onChange={(e) => handleContractFilterChange("endDate", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              <option value="All Dates">End Date: All</option>
              {contractEndDates.filter((d) => d !== "All Dates").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={contractFilters.location} onChange={(e) => handleContractFilterChange("location", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {contractLocations.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="px-6 py-4">Contract ID</th>
                <th className="px-6 py-4">Project & Customer</th>
                <th className="px-6 py-4">Location & Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Machines Allocated</th>
                <th className="px-6 py-4 text-right">Contract Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/30">
              {filteredContracts.map((row) => (
                <tr key={row.id} className="hover:bg-bg-active transition-colors group cursor-pointer">
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.projectName}</div>
                    <div className="text-[9px] text-text-dim">{row.customer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-text-main">{row.location}</div>
                    <div className="text-[9px] text-text-dim">{row.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-mono text-text-main">{row.startDate}</div>
                    <div className="text-[9px] font-mono text-text-dim">to {row.endDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${row.status === "Active" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : row.status === "Completed" ? "bg-green-500/10 text-green-500 border-green-500/20" : row.status === "Suspended" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                      {row.status}
                    </span>
                    {row.status === "Active" && row.expiringInDays <= 90 && row.expiringInDays > 0 && (
                      <div className="text-[8px] text-yellow-500 mt-1 font-bold">Expires in {row.expiringInDays}d</div>
                    )}
                    {row.status === "Active" && row.expiringInDays < 0 && (
                      <div className="text-[8px] text-red-500 mt-1 font-bold">Overdue {-row.expiringInDays}d</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[11px] font-mono font-bold bg-bg-deep px-2 py-1 rounded border border-border-main">
                      {row.machinesAllocated}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-text-main text-right">{formatINR(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default ContractReport;
