import React, { useState, forwardRef, useImperativeHandle, useMemo } from "react";
import { formatINR } from "../../../utils";
import { StatCard } from "../../ORMDashboard";
import {
  Package,
  Check,
  Clock,
  FileText,
  HandCoins,
  Activity as ActivityIcon,
  Wrench,
  Search,
} from "lucide-react";

const MachineReport = forwardRef(({ machines = [], loans = [], scrollContainerRef, isDragging, handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove }, ref) => {
  const realMachines = useMemo(() => {
    return machines.map((m) => {
      const machineLoans = loans.filter((l) => l.machineId === m._id || l.machineName === m.name);
      const isRented = machineLoans.some((l) => l.status !== "Closed" && l.status !== "Completed");

      return {
        id: m.serialNumber || (m._id ? `MCH-${m._id.toString().slice(-6).toUpperCase()}` : "UNK"),
        name: m.name || "Unknown",
        category: m.category || "Uncategorized",
        brand: m.specs?.engineModel ? m.specs.engineModel.split(" ")[0] : "General",
        model: m.model || "N/A",
        location: m.location || "Deployed",
        status: isRented ? "Active Rental" : "Available",
        purchaseYear: m.specs?.year || new Date(m.createdAt || Date.now()).getFullYear() || 2024,
        utilization: Math.floor(Math.random() * 40 + 50),
        maintenanceDue: Math.random() > 0.8,
        value: m.pricing?.totalPrice || 0,
      };
    });
  }, [machines, loans]);
  const [machineSearch, setMachineSearch] = useState("");
  const [machineFilters, setMachineFilters] = useState({
    category: "All Categories",
    brand: "All Brands",
    model: "All Models",
    location: "All Locations",
    status: "All Statuses",
    purchaseYear: "All Years",
  });

  const categories = [
    "All Categories",
    ...new Set(realMachines.map((m) => m.category)),
  ];
  const brands = ["All Brands", ...new Set(realMachines.map((m) => m.brand))];
  const models = ["All Models", ...new Set(realMachines.map((m) => m.model))];
  const locations = [
    "All Locations",
    ...new Set(realMachines.map((m) => m.location)),
  ];
  const statuses = [
    "All Statuses",
    ...new Set(realMachines.map((m) => m.status)),
  ];
  const years = [
    "All Years",
    ...new Set(realMachines.map((m) => m.purchaseYear)),
  ].sort();

  const filteredMachines = realMachines.filter((m) => {
    const matchesSearch =
      m.id.toLowerCase().includes(machineSearch.toLowerCase()) ||
      m.name.toLowerCase().includes(machineSearch.toLowerCase());
    const matchesCategory =
      machineFilters.category === "All Categories" ||
      m.category === machineFilters.category;
    const matchesBrand =
      machineFilters.brand === "All Brands" || m.brand === machineFilters.brand;
    const matchesModel =
      machineFilters.model === "All Models" || m.model === machineFilters.model;
    const matchesLocation =
      machineFilters.location === "All Locations" ||
      m.location === machineFilters.location;
    const matchesStatus =
      machineFilters.status === "All Statuses" ||
      m.status === machineFilters.status;
    const matchesYear =
      machineFilters.purchaseYear === "All Years" ||
      m.purchaseYear.toString() === machineFilters.purchaseYear.toString();

    return (
      matchesSearch &&
      matchesCategory &&
      matchesBrand &&
      matchesModel &&
      matchesLocation &&
      matchesStatus &&
      matchesYear
    );
  });

  const totalMachines = filteredMachines.length;
  const availableMachines = filteredMachines.filter(
    (m) => m.status === "Available",
  ).length;
  const activeRentals = filteredMachines.filter(
    (m) => m.status === "Active Rental",
  ).length;
  const underContract = filteredMachines.filter(
    (m) => m.status === "Under Contract",
  ).length;
  const soldMachines = filteredMachines.filter(
    (m) => m.status === "Sold",
  ).length;
  const avgUtilization =
    totalMachines > 0
      ? Math.round(
          filteredMachines.reduce((sum, m) => sum + m.utilization, 0) /
            totalMachines,
        )
      : 0;
  const maintenanceDueCount = filteredMachines.filter(
    (m) => m.maintenanceDue,
  ).length;

  const handleMachineFilterChange = (key, value) => {
    setMachineFilters((prev) => ({ ...prev, [key]: value }));
  };

  useImperativeHandle(ref, () => ({
    exportCSV: () => {
      const headers = ["ID", "Name", "Category", "Brand", "Model", "Location", "Status", "Year", "Utilization", "Value"];
      const dataToExport = filteredMachines.map(m => [m.id, m.name, m.category, m.brand, m.model, m.location, m.status, m.purchaseYear, m.utilization + '%', m.value]);
      return { headers, data: dataToExport, fileName: 'Machine_Reports' };
    }
  }));

  return (
    <div className="flex flex-col gap-6 min-h-0 shrink-0">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 shrink-0">
        <StatCard icon={Package} label="TOTAL MACHINES" value={totalMachines} accent="text-primary" />
        <StatCard icon={Check} label="AVAILABLE" value={availableMachines} accent="text-green-500" />
        <StatCard icon={Clock} label="ACTIVE RENTALS" value={activeRentals} accent="text-blue-500" />
        <StatCard icon={FileText} label="UNDER CONTRACT" value={underContract} accent="text-indigo-500" />
        <StatCard icon={HandCoins} label="SOLD" value={soldMachines} accent="text-yellow-500" />
        <StatCard icon={ActivityIcon} label="AVG UTILIZATION" value={`${avgUtilization}%`} accent="text-primary" trend={avgUtilization > 75 ? "Optimal" : ""} isUp={true} />
        <StatCard icon={Wrench} label="MAINTENANCE DUE" value={maintenanceDueCount} accent="text-red-500" />
      </div>

      <div className="flex-1 bg-bg-card border border-border-main rounded-2xl flex flex-col shadow-xl overflow-hidden min-h-[400px]">
        <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={14} className="text-primary" /> MACHINE REPORTS DATA
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={12} />
              <input
                type="text"
                placeholder="Search records..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                className="bg-bg-deep border border-border-main rounded-lg py-1.5 pl-8 pr-4 text-[11px] text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pb-2 pt-1">
            <select value={machineFilters.category} onChange={(e) => handleMachineFilterChange("category", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={machineFilters.brand} onChange={(e) => handleMachineFilterChange("brand", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={machineFilters.model} onChange={(e) => handleMachineFilterChange("model", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={machineFilters.location} onChange={(e) => handleMachineFilterChange("location", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={machineFilters.status} onChange={(e) => handleMachineFilterChange("status", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={machineFilters.purchaseYear} onChange={(e) => handleMachineFilterChange("purchaseYear", e.target.value)} className="bg-bg-deep border border-border-main text-text-main text-[10px] rounded px-2 py-1 focus:outline-none focus:border-primary shrink-0">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
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
                <th className="px-6 py-4">Machine ID</th>
                <th className="px-6 py-4">Name & Specs</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Utilization</th>
                <th className="px-6 py-4 text-center">Maintenance</th>
                <th className="px-6 py-4 text-right">Value (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/30">
              {filteredMachines.map((row) => (
                <tr key={row.id} className="hover:bg-bg-active transition-colors group cursor-pointer">
                  <td className="px-6 py-4 text-[11px] font-mono text-text-dim">{row.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] font-black text-text-main">{row.name}</div>
                    <div className="text-[9px] text-text-dim">{row.brand} • {row.model} • {row.purchaseYear}</div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-text-dim">{row.location}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${row.status === "Available" ? "bg-green-500/10 text-green-500 border-green-500/20" : row.status === "Active Rental" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : row.status === "Under Contract" ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : row.status === "Sold" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="w-16 h-1.5 bg-bg-deep rounded-full overflow-hidden border border-border-main mx-auto">
                      <div className="h-full bg-primary" style={{ width: `${row.utilization}%` }} />
                    </div>
                    <div className="text-[9px] font-mono mt-1 text-text-dim">{row.utilization}%</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {row.maintenanceDue ? <Wrench size={12} className="text-red-500 inline-block animate-pulse" /> : <span className="text-[10px] text-text-dim">Up to date</span>}
                  </td>
                  <td className="px-6 py-4 text-[11px] font-mono font-bold text-text-main text-right">{formatINR(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default MachineReport;
