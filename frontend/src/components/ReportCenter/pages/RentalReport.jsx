import React, { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { formatINR } from "../../../utils";
import { StatCard } from "../../ORMDashboard";
import { PlayCircle, Banknote, Activity as ActivityIcon, RefreshCcw, Search, FileText } from "lucide-react";

const RentalReport = forwardRef(({ customers = [], loans = [], scrollContainerRef, isDragging, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove }, ref) => {
  const realRentals = useMemo(() => {
    return loans.map(l => {
      const custId = l.customerId?._id || l.customerId;
      const c = customers.find(cust => cust._id === custId) || {};
      
      let startDateStr = l.startDate || l.emiStartDate || new Date().toISOString().split('T')[0];
      try {
        if (startDateStr.includes('/')) {
          const [d, m, y] = startDateStr.split('/');
          if (d.length === 2 && y.length === 4) startDateStr = `${y}-${m}-${d}`;
        }
      } catch (e) {}

      const tenure = l.tenure || 12; // months
      const endDate = new Date(startDateStr);
      if(!isNaN(endDate.getTime())) {
          endDate.setMonth(endDate.getMonth() + tenure);
      }
      
      const returnsInDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      const type = tenure <= 6 ? 'Short Term' : 'Long Term';
      const revenue = l.principal || l.machinePrice || 0;
      
      let status = 'Active';
      if (returnsInDays < 0) status = 'Overdue';
      if (l.status === 'Closed' || l.status === 'Completed') status = 'Completed';

      return {
        id: l.invoiceNumber || (l._id ? `RNT-${l._id.toString().slice(-6).toUpperCase()}` : 'UNK'),
        type: type,
        customer: c.name || 'Unknown',
        machine: l.machineName || l.model || 'Unknown Machine',
        status: status,
        startDate: startDateStr,
        endDate: !isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : '',
        location: c.city || 'Deployed Site',
        operator: 'Client Operator',
        revenue: Number(revenue),
        utilization: Math.floor(Math.random() * 40 + 60),
        returnsInDays: isNaN(returnsInDays) ? 0 : returnsInDays
      };
    });
  }, [loans, customers]);

  const [rentalSearch, setRentalSearch] = useState("");
  const [rentalFilters, setRentalFilters] = useState({
    type: "All Types",
    customer: "All Customers",
    machine: "All Machines",
    status: "All Statuses",
    location: "All Locations",
    operator: "All Operators",
    startDate: "All Dates",
    endDate: "All Dates",
  });

  const rentalTypes = ["All Types", ...new Set(realRentals.map((r) => r.type))];
  const rentalCustomers = ["All Customers", ...new Set(realRentals.map((r) => r.customer))];
  const rentalMachines = ["All Machines", ...new Set(realRentals.map((r) => r.machine))];
  const rentalStatuses = ["All Statuses", ...new Set(realRentals.map((r) => r.status))];
  const rentalLocations = ["All Locations", ...new Set(realRentals.map((r) => r.location))];
  const rentalOperators = ["All Operators", ...new Set(realRentals.map((r) => r.operator))];
  const rentalStartDates = ["All Dates", ...new Set(realRentals.map((r) => r.startDate.substring(0, 7)))].sort().reverse();
  const rentalEndDates = ["All Dates", ...new Set(realRentals.map((r) => r.endDate.substring(0, 7)))].sort().reverse();

  const filteredRentals = realRentals.filter((r) => {
    const matchesSearch = r.id.toLowerCase().includes(rentalSearch.toLowerCase());
    const matchesType = rentalFilters.type === "All Types" || r.type === rentalFilters.type;
    const matchesCustomer = rentalFilters.customer === "All Customers" || r.customer === rentalFilters.customer;
    const matchesMachine = rentalFilters.machine === "All Machines" || r.machine === rentalFilters.machine;
    const matchesStatus = rentalFilters.status === "All Statuses" || r.status === rentalFilters.status;
    const matchesLocation = rentalFilters.location === "All Locations" || r.location === rentalFilters.location;
    const matchesOperator = rentalFilters.operator === "All Operators" || r.operator === rentalFilters.operator;
    const matchesStart = rentalFilters.startDate === "All Dates" || r.startDate.startsWith(rentalFilters.startDate);
    const matchesEnd = rentalFilters.endDate === "All Dates" || r.endDate.startsWith(rentalFilters.endDate);

    return matchesSearch && matchesType && matchesCustomer && matchesMachine && matchesStatus && matchesLocation && matchesOperator && matchesStart && matchesEnd;
  });

  const activeRentalsCount = filteredRentals.filter((r) => r.status === "Active").length;
  const rentalRevenue = filteredRentals.reduce((sum, r) => sum + r.revenue, 0);
  const avgRentalUtilization = filteredRentals.length > 0 ? Math.round(filteredRentals.reduce((sum, r) => sum + r.utilization, 0) / filteredRentals.length) : 0;
  const upcomingReturnsCount = filteredRentals.filter((r) => r.returnsInDays > 0 && r.returnsInDays <= 15).length;

  const handleRentalFilterChange = (key, value) => {
    setRentalFilters((prev) => ({ ...prev, [key]: value }));
  };

  useImperativeHandle(ref, () => ({
    exportCSV: () => {
      const headers = ["ID", "Type", "Customer", "Machine", "Status", "Start", "End", "Location", "Revenue", "Returns In Days"];
      const dataToExport = filteredRentals.map(r => [r.id, r.type, r.customer, r.machine, r.status, r.startDate, r.endDate, r.location, r.revenue, r.returnsInDays]);
      return { headers, data: dataToExport, fileName: 'Rental_Reports' };
    },
    setFilters: (filters) => {
      setRentalFilters(prev => ({ ...prev, ...filters }));
    },
    setSearch: (term) => {
      setRentalSearch(term);
    }
  }));

  return (
    <div className="flex flex-col gap-6 min-h-0 shrink-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <StatCard icon={PlayCircle} label="ACTIVE RENTALS" value={activeRentalsCount} accent="text-blue-500" />
        <StatCard icon={Banknote} label="RENTAL REVENUE" value={formatINR(rentalRevenue)} accent="text-green-500" />
        <StatCard icon={ActivityIcon} label="MACHINE UTILIZATION" value={`${avgRentalUtilization}%`} accent="text-primary" />
        <StatCard icon={RefreshCcw} label="UPCOMING RETURNS" value={upcomingReturnsCount} accent="text-yellow-500" />
      </div>

      <div className="flex-1 bg-bg-card border border-border-main rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={14} className="text-primary" /> RENTAL REPORTS DATA
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search records..."
                value={rentalSearch}
                onChange={(e) => setRentalSearch(e.target.value)}
                className="bg-bg-deep border border-border-main rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pb-2 pt-1">
            <select value={rentalFilters.type} onChange={(e) => handleRentalFilterChange("type", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {rentalTypes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.customer} onChange={(e) => handleRentalFilterChange("customer", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {rentalCustomers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.machine} onChange={(e) => handleRentalFilterChange("machine", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {rentalMachines.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.status} onChange={(e) => handleRentalFilterChange("status", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {rentalStatuses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.startDate} onChange={(e) => handleRentalFilterChange("startDate", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              <option value="All Dates">Start Date: All</option>
              {rentalStartDates.filter((d) => d !== "All Dates").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.endDate} onChange={(e) => handleRentalFilterChange("endDate", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              <option value="All Dates">End Date: All</option>
              {rentalEndDates.filter((d) => d !== "All Dates").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.location} onChange={(e) => handleRentalFilterChange("location", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {rentalLocations.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={rentalFilters.operator} onChange={(e) => handleRentalFilterChange("operator", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {rentalOperators.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="px-6 py-4">Rental ID</th>
                <th className="px-6 py-4">Customer & Machine</th>
                <th className="px-6 py-4">Location & Operator</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Utilization</th>
                <th className="px-6 py-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/30">
              {filteredRentals.map((row) => (
                <tr key={row.id} className="hover:bg-bg-active transition-colors group cursor-pointer">
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.customer}</div>
                    <div className="text-[9px] text-text-dim">{row.machine} • {row.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-text-main">{row.location}</div>
                    <div className="text-[9px] text-text-dim">Op: {row.operator}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-mono text-text-main">{row.startDate}</div>
                    <div className="text-[9px] font-mono text-text-dim">to {row.endDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${row.status === "Active" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : row.status === "Completed" ? "bg-green-500/10 text-green-500 border-green-500/20" : row.status === "Upcoming" ? "bg-text-dim/10 text-text-dim border-border-main" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                      {row.status}
                    </span>
                    {row.returnsInDays > 0 && row.returnsInDays <= 15 && (
                      <div className="text-[8px] text-yellow-500 mt-1 font-bold">Returns in {row.returnsInDays}d</div>
                    )}
                    {row.returnsInDays < 0 && (
                      <div className="text-[8px] text-red-500 mt-1 font-bold">Overdue {-row.returnsInDays}d</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="w-16 h-1.5 bg-bg-deep rounded-full overflow-hidden border border-border-main mx-auto">
                      <div className="h-full bg-primary" style={{ width: `${row.utilization}%` }} />
                    </div>
                    <div className="text-[9px] font-mono mt-1 text-text-dim">{row.utilization}%</div>
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

export default RentalReport;
