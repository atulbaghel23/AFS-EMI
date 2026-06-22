import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Clock, Banknote, Users, Truck, Settings2, RotateCcw, CheckCircle2 } from 'lucide-react';

const INITIAL_FILTERS = {
  date: { type: 'EMI Due Date', from: '', to: '' },
  financial: {
    downPayment: { min: '', max: '' },
    emi: { min: '', max: '' },
    outstanding: { min: '', max: '' },
  },
  status: [],
  overdueDays: { min: '', max: '' },
  customer: { name: '', type: '' },
  machine: { category: '', status: '' },
};

const DATE_TYPES = [
  'Sale Date', 'EMI Due Date', 'Payment Date',
  'Contract Start Date', 'Contract End Date',
  'Rental Start Date', 'Rental End Date',
];

const EMI_STATUSES = ['Upcoming', 'Overdue', 'Paid', 'Unpaid', 'Partially Paid', 'Closed'];

const inputCls = "w-full bg-bg-deep border border-border-main rounded px-2 py-1.5 text-[11px] text-text-main focus:border-primary focus:outline-none transition-colors placeholder:text-text-dim/50";

const Section = ({ icon: Icon, title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border-main rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-bg-active hover:bg-bg-active/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-primary" />
          <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{title}</span>
        </div>
        {open
          ? <ChevronUp size={12} className="text-text-dim" />
          : <ChevronDown size={12} className="text-text-dim" />}
      </button>
      {open && <div className="px-3 py-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
};

const FilterSidebar = ({ isOpen, onToggle, filters, onApply, headerRight }) => {
  const [local, setLocal] = useState(() => ({ ...INITIAL_FILTERS, ...filters }));

  // Sync when filters prop changes externally
  useEffect(() => {
    setLocal({ ...INITIAL_FILTERS, ...filters });
  }, [isOpen, filters]);

  const set = (path, value) => {
    setLocal(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const toggleStatus = (status) => {
    setLocal(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleReset = () => {
    const fresh = JSON.parse(JSON.stringify(INITIAL_FILTERS));
    setLocal(fresh);
    onApply(fresh);
  };

  const handleApply = () => {
    onApply(local);
    if (isOpen) onToggle();
  };

  return (
    <div className="bg-bg-card border border-border-main rounded-xl shadow-sm shrink-0 flex flex-col p-2 mb-4">
      {/* Header (Always Visible) */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-main bg-bg-active/40 transition-colors rounded-t-lg">
        {/* Clickable toggle area */}
        <div 
          onClick={onToggle}
          className="flex items-center gap-2 cursor-pointer group flex-1"
        >
          <Settings2 size={15} className="text-primary" />
          <span className="text-[12px] font-black text-text-main tracking-wide uppercase group-hover:text-primary transition-colors">Advanced Filters</span>
          <button className="p-1 rounded-md transition-colors text-text-dim group-hover:text-primary ml-2">
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
        
        {/* External Actions (like Export CSV) */}
        {headerRight && (
          <div className="flex items-center gap-3">
            {headerRight}
          </div>
        )}
      </div>

      {/* Grid Body with Accordion Animation */}
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Column 1: Dates & Status */}
        <div className="flex flex-col gap-4">
          <Section icon={Clock} title="Date Filter">
            <select className={inputCls} value={local.date.type} onChange={e => set('date.type', e.target.value)}>
              {DATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-dim uppercase">From</span>
                <input type="date" className={inputCls} value={local.date.from} onChange={e => set('date.from', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-dim uppercase">To</span>
                <input type="date" className={inputCls} value={local.date.to} onChange={e => set('date.to', e.target.value)} />
              </div>
            </div>
          </Section>

          <Section icon={Settings2} title="EMI Status">
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
              {EMI_STATUSES.map(status => (
                <label key={status} className="flex items-center gap-2 text-[11px] text-text-main cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    className="accent-primary w-3.5 h-3.5"
                    checked={local.status.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  {status}
                </label>
              ))}
            </div>
          </Section>
        </div>

        {/* Column 2: Financials & Overdue */}
        <div className="flex flex-col gap-4">
          <Section icon={Banknote} title="Financial Ranges">
            {[
              { label: 'Down Payment', path: 'downPayment' },
              { label: 'EMI Amount', path: 'emi' },
              { label: 'Outstanding Balance', path: 'outstanding' },
            ].map(({ label, path }) => (
              <div key={path} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-dim uppercase">{label}</span>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min ₹" className={inputCls} value={local.financial[path].min} onChange={e => set(`financial.${path}.min`, e.target.value)} />
                  <span className="text-text-dim text-[11px] shrink-0">–</span>
                  <input type="number" placeholder="Max ₹" className={inputCls} value={local.financial[path].max} onChange={e => set(`financial.${path}.max`, e.target.value)} />
                </div>
              </div>
            ))}
          </Section>

          <Section icon={Clock} title="Days Overdue">
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min days" className={inputCls} value={local.overdueDays.min} onChange={e => set('overdueDays.min', e.target.value)} />
              <span className="text-text-dim text-[11px] shrink-0">–</span>
              <input type="number" placeholder="Max days" className={inputCls} value={local.overdueDays.max} onChange={e => set('overdueDays.max', e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[['1–30', 1, 30], ['31–60', 31, 60], ['61–90', 61, 90], ['90+', 90, 999]].map(([label, min, max]) => (
                <button
                  key={label}
                  onClick={() => setLocal(prev => ({ ...prev, overdueDays: { min: String(min), max: String(max) } }))}
                  className="px-2.5 py-0.5 text-[10px] font-bold border border-border-main rounded-full text-text-dim hover:border-primary hover:text-primary transition-colors"
                >
                  {label} Days
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* Column 3: Customer & Machine */}
        <div className="flex flex-col gap-4">
          <Section icon={Users} title="Customer Filters">
            <input type="text" placeholder="Search customer name…" className={inputCls} value={local.customer.name} onChange={e => set('customer.name', e.target.value)} />
            <select className={inputCls} value={local.customer.type} onChange={e => set('customer.type', e.target.value)}>
              <option value="">All Customer Types</option>
              <option value="Company">Company</option>
              <option value="Individual">Individual</option>
            </select>
          </Section>

          <Section icon={Truck} title="Machine Filters">
            <select className={inputCls} value={local.machine.category} onChange={e => set('machine.category', e.target.value)}>
              <option value="">All Categories</option>
              <option value="Crane">Crane</option>
              <option value="Excavator">Excavator</option>
            </select>
            <select className={inputCls} value={local.machine.status} onChange={e => set('machine.status', e.target.value)}>
              <option value="">All Machine Statuses</option>
              <option value="Sold">Sold</option>
              <option value="Available">Available</option>
              <option value="Rented">Rented</option>
            </select>
          </Section>
          
          {/* Footer Actions Inline */}
          <div className="mt-auto flex items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded border border-border-main bg-bg-deep hover:border-text-dim text-[11px] font-bold text-text-main transition-colors flex-1"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              onClick={handleApply}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded bg-primary hover:bg-primary/90 text-[11px] font-bold text-black transition-colors flex-[2]"
            >
              <CheckCircle2 size={12} /> Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default FilterSidebar;
