import React, { useState, useRef } from "react";
import { Filter, Clock, ChevronDown, Download } from "lucide-react";

import { state } from "../../state";

import MachineReport from "./pages/MachineReport";
import CustomerReport from "./pages/CustomerReport";
import SalesReport from "./pages/SalesReport";
import RentalReport from "./pages/RentalReport";
import ContractReport from "./pages/ContractReport";
import EMIPaymentReport from "./pages/EMIPaymentReport";
import FilterSidebar from "./Filters/FilterSidebar";

const ReportCenter = () => {
  const [activeReport, setActiveReport] = useState("Machine Reports");
  const reportTypes = [
    "Machine Reports",
    "Customer Reports",
    "Sales Reports",
    "Rental Reports",
    "Contract Reports",
    "EMI & Payment Reports",
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [globalFilters, setGlobalFilters] = useState({
    date: { type: 'EMI Due Date', from: '', to: '', preset: '' },
    financial: { 
      downPayment: { min: '', max: '' }, 
      emi: { min: '', max: '' }, 
      outstanding: { min: '', max: '' } 
    },
    status: [],
    overdueDays: { min: '', max: '' },
    customer: { name: '', type: '', locations: [], executives: [] },
    machine: { category: '', models: [], status: '' },
    advanced: []
  });

  const { customers = [], loans = [], payments = [], machines = [] } = state?.data || {};

  // Drag to scroll logic shared across tables
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const dragHandlers = {
    scrollContainerRef,
    isDragging,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove
  };

  const machineReportRef = useRef(null);
  const customerReportRef = useRef(null);
  const salesReportRef = useRef(null);
  const rentalReportRef = useRef(null);
  const contractReportRef = useRef(null);
  const emiPaymentReportRef = useRef(null);

  const handleExportCSV = () => {
    let result = null;

    if (activeReport === "Machine Reports" && machineReportRef.current) {
      result = machineReportRef.current.exportCSV();
    } else if (activeReport === "Customer Reports" && customerReportRef.current) {
      result = customerReportRef.current.exportCSV();
    } else if (activeReport === "Sales Reports" && salesReportRef.current) {
      result = salesReportRef.current.exportCSV();
    } else if (activeReport === "Rental Reports" && rentalReportRef.current) {
      result = rentalReportRef.current.exportCSV();
    } else if (activeReport === "Contract Reports" && contractReportRef.current) {
      result = contractReportRef.current.exportCSV();
    } else if (activeReport === "EMI & Payment Reports" && emiPaymentReportRef.current) {
      result = emiPaymentReportRef.current.exportCSV();
    }

    if (result) {
      const csvContent = [
        result.headers.join(","),
        ...result.data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${result.fileName}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePresetClick = (preset) => {
    switch (preset) {
      case "Active Rentals":
        setActiveReport("Rental Reports");
        setTimeout(() => {
          if (rentalReportRef.current) {
            rentalReportRef.current.setFilters({
              type: "All Types",
              customer: "All Customers",
              machine: "All Machines",
              status: "Active",
              location: "All Locations",
              operator: "All Operators",
              startDate: "All Dates",
              endDate: "All Dates"
            });
            rentalReportRef.current.setSearch("");
          }
        }, 0);
        break;
      case "Overdue EMIs":
        setActiveReport("EMI & Payment Reports");
        setTimeout(() => {
          if (emiPaymentReportRef.current) {
            emiPaymentReportRef.current.setFilters({
              customer: "All Customers",
              machine: "All Machines",
              status: "Overdue",
              dueDate: "All Dates",
              paymentMethod: "All Methods",
              provider: "All Providers",
            });
            emiPaymentReportRef.current.setSearch("");
          }
        }, 0);
        break;
      case "Expiring Contracts":
        setActiveReport("Contract Reports");
        setTimeout(() => {
          if (contractReportRef.current) {
            contractReportRef.current.setFilters({
              type: "All Types",
              customer: "All Customers",
              projectName: "All Projects",
              status: "Active",
              location: "All Locations",
              startDate: "All Dates",
              endDate: "All Dates"
            });
            contractReportRef.current.setSearch("");
          }
        }, 0);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto custom-scrollbar pr-2 animate-fade-in">

      {/* Filter Drawer */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(o => !o)}
        filters={globalFilters}
        onApply={setGlobalFilters}
        headerRight={
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-deep border border-border-main rounded text-[10px] font-bold text-text-main hover:text-primary transition-colors uppercase shrink-0"
          >
            <Download size={12} /> Export CSV
          </button>
        }
      />

      {/* Single unified nav bar: Tabs | Presets || Filters | Export */}
      <div className="flex items-center gap-2 shrink-0 overflow-x-auto custom-scrollbar bg-bg-card border border-border-main rounded-xl px-3 py-2 shadow-sm mb-4">
        {/* Report type tabs */}
        <div className="flex bg-bg-active p-0.5 rounded-lg border border-border-main shrink-0">
          {reportTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                if (activeReport === type) {
                  if (type === "Rental Reports" && rentalReportRef.current && rentalReportRef.current.setFilters) {
                    rentalReportRef.current.setFilters({ type: "All Types", customer: "All Customers", machine: "All Machines", status: "All Statuses", location: "All Locations", operator: "All Operators", startDate: "All Dates", endDate: "All Dates" });
                    rentalReportRef.current.setSearch("");
                  } else if (type === "EMI & Payment Reports" && emiPaymentReportRef.current && emiPaymentReportRef.current.setFilters) {
                    emiPaymentReportRef.current.setFilters({ customer: "All Customers", machine: "All Machines", status: "All Statuses", dueDate: "All Dates", paymentMethod: "All Methods", provider: "All Providers" });
                    emiPaymentReportRef.current.setSearch("");
                  } else if (type === "Contract Reports" && contractReportRef.current && contractReportRef.current.setFilters) {
                    contractReportRef.current.setFilters({ type: "All Types", customer: "All Customers", projectName: "All Projects", status: "All Statuses", location: "All Locations", startDate: "All Dates", endDate: "All Dates" });
                    contractReportRef.current.setSearch("");
                  }
                } else {
                  setActiveReport(type);
                }
              }}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeReport === type ? "bg-bg-card border border-border-main text-primary shadow-sm" : "text-text-dim hover:text-text-main border border-transparent"}`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border-main shrink-0 mx-1" />

        {/* Preset chips */}
        <span className="text-[9px] font-black text-text-dim uppercase tracking-widest shrink-0">Presets:</span>
        {["Active Rentals", "Overdue EMIs", "Expiring Contracts"].map((chip) => (
          <button
            key={chip}
            onClick={() => handlePresetClick(chip)}
            className="px-2.5 py-1 bg-bg-deep border border-border-main rounded-full text-[10px] text-text-main hover:border-primary hover:text-primary transition-colors whitespace-nowrap shrink-0"
          >
            {chip}
          </button>
        ))}

        {/* Spacer pushes actions to far right (if any remain) */}
        <div className="flex-1 min-w-[8px]" />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {activeReport === "Machine Reports" && <MachineReport ref={machineReportRef} machines={machines} loans={loans} {...dragHandlers} />}
        {activeReport === "Customer Reports" && <CustomerReport ref={customerReportRef} customers={customers} loans={loans} payments={payments} {...dragHandlers} />}
        {activeReport === "Sales Reports" && <SalesReport ref={salesReportRef} customers={customers} loans={loans} {...dragHandlers} />}
        {activeReport === "Rental Reports" && <RentalReport ref={rentalReportRef} customers={customers} loans={loans} {...dragHandlers} />}
        {activeReport === "Contract Reports" && <ContractReport ref={contractReportRef} customers={customers} loans={loans} {...dragHandlers} />}
        {activeReport === "EMI & Payment Reports" && <EMIPaymentReport ref={emiPaymentReportRef} customers={customers} loans={loans} payments={payments} globalFilters={globalFilters} {...dragHandlers} />}
      </div>
    </div>
  );

};

export default ReportCenter;
