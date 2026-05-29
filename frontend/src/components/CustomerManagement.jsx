import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import { showNotification, formatINR, confirmAction, hasPermission } from '../utils';
import Modal from './Modal.jsx';
import {
  X, Search, Check, ChevronDown, FileText, MapPin, Building2,
  Fingerprint, ShieldCheck, UserCheck, Eye, Edit3, Trash2, Plus,
  LayoutGrid, List, MoreHorizontal, Filter, SlidersHorizontal, RefreshCw,
  Loader2, CheckCircle2, AlertCircle, Fingerprint as UserIcon, Mail, Phone,
  Settings2, EyeOff, Hash, Globe, CreditCard, Landmark, Navigation,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Captcha from './Captcha';

// Custom Searchable Dropdown Component
const SearchableDropdown = ({ label, options, selected, onSelect, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">{label}</p>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg-deep/60 border border-border-main rounded-lg px-3 py-2 text-xs text-text-main font-bold flex items-center justify-between hover:border-[#f0883e]/50 transition-all"
      >
        <span>{selected || 'Select Protocol'}</span>
        <ChevronDown size={14} className="text-text-dim transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-main rounded-xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-top-2">
          <div className="relative mb-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-deep border border-border-main rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-text-main outline-none focus:border-[#f0883e]"
              placeholder="Search..."
            />
          </div>
          <div className="max-h-40 overflow-y-auto no-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onSelect(opt); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${selected === opt ? 'bg-[#f0883e] text-black' : 'text-text-dim hover:bg-bg-active hover:text-text-main'}`}
              >
                {opt}
              </button>
            )) : (
              <p className="text-center py-2 text-[9px] font-bold text-text-dim uppercase">No Match</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerManagement = () => {
  const { customers, user, customerColumns: globalConfig } = state.data;
  const roleName = (user?.roleId?.name || user?.role || '').toUpperCase();
  const isAdmin = roleName.includes('ADMIN') || roleName.includes('SUPER');

  // Fallback if globalConfig is missing during initial load
  const defaultConfig = {
    name: true, customId: true, mobile: true, email: true, gst: true, pan: true,
    bankAcc: true, ifsc: true, status: true, type: true, city: true, pin: true, address: true, overdue: true, control: true
  };

  const [localColConfig, setLocalColConfig] = useState(globalConfig || defaultConfig);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [filterType, setFilterType] = useState('EMI');
  const [search, setSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showColConfig, setShowColConfig] = useState(false);
  const colConfigRef = useRef(null);
  const filtersRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colConfigRef.current && !colConfigRef.current.contains(event.target)) {
        setShowColConfig(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: 'All',
    city: 'All'
  });

  const toggleColumn = (key) => {
    if (!isAdmin) return showNotification('Access Denied: Only Admin can modify global view protocols', 'error');
    const newConfig = { ...localColConfig, [key]: !localColConfig[key] };
    setLocalColConfig(newConfig);
    state.updateConfig({ customerColumns: newConfig });
  };

  useEffect(() => {
    if (globalConfig) {
      setLocalColConfig(globalConfig);
    }
  }, [globalConfig]);

  const cities = ['All', ...new Set((customers || []).filter(Boolean).map(c => c.city).filter(Boolean))];

  const filtered = (customers || []).filter(c => {
    if (!c) return false;
    let typeMatch = false;
    const cType = c.type || 'EMI';
    if (filterType === 'EMI') {
      typeMatch = cType === 'EMI' || cType === 'EMI/Rentals';
    } else if (filterType === 'Rental') {
      typeMatch = cType === 'Rental' || cType === 'Rentals';
    } else if (filterType === 'FMC') {
      typeMatch = cType === 'FMC';
    }
    const searchLower = (search || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    const mobile = (c.mobile || '');
    const id = (c._id || '').toLowerCase();
    const customId = (c.customId || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const gst = (c.gst || '').toLowerCase();
    const pan = (c.pan || '').toLowerCase();
    const city = (c.city || '').toLowerCase();
    const address = (c.address || '').toLowerCase();

    const searchMatch = !search ||
      name.includes(searchLower) ||
      mobile.includes(searchLower) ||
      id.includes(searchLower) ||
      customId.includes(searchLower) ||
      email.includes(searchLower) ||
      gst.includes(searchLower) ||
      pan.includes(searchLower) ||
      city.includes(searchLower) ||
      address.includes(searchLower);

    const statusMatch = filters.status === 'All' || c.status === filters.status;
    const cityMatch = filters.city === 'All' || c.city === filters.city;

    return typeMatch && searchMatch && statusMatch && cityMatch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setFilters({ status: 'All', city: 'All' });
    setSearch('');
    setCurrentPage(1);
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer, e) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (id, e) => {
    e.stopPropagation();
    if (await confirmAction('Purge Client Record?', 'This will permanently remove the client and all associated access protocols.')) {
      await state.deleteCustomer(id);
      showNotification('Client Profile Deleted', 'error');
    }
  };

  const handleViewAnalytics = (customer) => {
    state.setState({
      view: 'customer-analytics',
      selectedCustomerId: customer._id
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col gap-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-text-main tracking-tighter uppercase italic flex items-center gap-3">
              <UserCheck className="text-[#f0883e]" size={32} /> Client Management
            </h2>
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <ShieldCheck size={12} className="text-[#3fb950]" /> Strategic Onboarding & Compliance Terminal
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div ref={colConfigRef} className="relative">
              <button
                onClick={() => setShowColConfig(!showColConfig)}
                className={`p-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showColConfig ? 'bg-[#f0883e]/10 border-[#f0883e]/50 text-[#f0883e]' : 'bg-bg-deep border border-border-main text-text-dim hover:text-text-main'
                  }`}
                title="Configure View Columns"
              >
                <Settings2 size={16} />
              </button>

              {showColConfig && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-bg-card border border-border-main rounded-2xl shadow-2xl z-[60] p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Global View Protocols</h4>
                    {!isAdmin && <span className="text-[7px] font-bold text-red-500 uppercase flex items-center gap-1"><ShieldCheck size={10} /> Read Only</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'name', label: 'Legal Name', icon: <UserCheck size={10} /> },
                      { id: 'customId', label: 'Customer ID', icon: <Hash size={10} /> },
                      { id: 'mobile', label: 'Mobile No.', icon: <Phone size={10} /> },
                      { id: 'email', label: 'Email Protocol', icon: <Mail size={10} /> },
                      { id: 'gst', label: 'GSTIN', icon: <Fingerprint size={10} /> },
                      { id: 'pan', label: 'PAN Card', icon: <FileText size={10} /> },
                      { id: 'bankAcc', label: 'Bank Account', icon: <CreditCard size={10} /> },
                      { id: 'ifsc', label: 'IFSC Code', icon: <Landmark size={10} /> },
                      { id: 'status', label: 'Risk Status', icon: <CheckCircle2 size={10} /> },
                      { id: 'type', label: 'Client Type', icon: <Filter size={10} /> },
                      { id: 'city', label: 'City Node', icon: <MapPin size={10} /> },
                      { id: 'pin', label: 'Pin Code', icon: <Navigation size={10} /> },
                      { id: 'address', label: 'Full Address', icon: <Globe size={10} /> },
                      { id: 'overdue', label: 'Net Overdue', icon: <AlertCircle size={10} /> },
                      { id: 'control', label: 'Operations', icon: <Settings2 size={10} /> }
                    ].map(col => (
                      <button
                        key={col.id}
                        disabled={!isAdmin}
                        onClick={() => toggleColumn(col.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-[8px] font-black uppercase transition-all ${localColConfig[col.id] ? 'bg-[#f0883e]/10 text-[#f0883e]' : 'bg-bg-deep text-text-dim hover:text-slate-400'
                          } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {localColConfig[col.id] ? <Check size={10} /> : <div className="w-[10px] h-[10px] border border-slate-700 rounded-sm" />}
                        {col.label}
                      </button>
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-border-main flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f0883e] animate-pulse" />
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Changes will be broadcasted to all users</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasPermission(user, 'customers', 'create') && (
              <button
                onClick={handleAddCustomer}
                className="px-8 py-3 bg-[#f0883e] text-black text-xs font-black rounded-xl hover:bg-[#f0883e]/90 transition-all shadow-[0_0_20px_rgba(240,136,62,0.15)] active:scale-95 uppercase tracking-widest flex items-center gap-2"
              >
                <Plus size={16} /> ONBOARD CLIENT
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-bg-card/50 border border-border-main rounded-2xl relative">
          <div className="flex items-center p-1 bg-bg-deep border border-border-main rounded-xl">
            {['EMI', 'Rental', 'FMC'].map(type => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setCurrentPage(1); }}
                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === type ? 'bg-[#f0883e] text-black shadow-lg shadow-orange-500/10' : 'text-text-dim hover:text-text-main'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex flex-1 max-w-2xl gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search Name, Mobile, GST, PAN, City..."
                className="w-full pl-10 pr-4 py-3 bg-bg-deep border border-border-main rounded-xl text-xs text-text-main font-bold focus:border-[#f0883e] outline-none transition-all placeholder:text-text-dim"
              />
            </div>

            <div ref={filtersRef} className="relative">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showAdvancedFilters || filters.status !== 'All' || filters.city !== 'All'
                  ? 'bg-[#f0883e]/10 border-[#f0883e]/50 text-[#f0883e]'
                  : 'bg-bg-deep border border-border-main text-text-dim hover:border-text-dim'
                  }`}
              >
                <SlidersHorizontal size={14} />
                Filters
              </button>

              {showAdvancedFilters && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-bg-card border border-border-main rounded-2xl shadow-2xl z-[60] p-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Advanced Filters</h4>
                    <button onClick={resetFilters} className="text-[9px] font-bold text-[#f0883e] hover:underline uppercase flex items-center gap-1">
                      <RefreshCw size={10} /> Reset
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-[8px] font-bold text-text-dim uppercase tracking-[0.2em]">Compliance Status</p>
                      <div className="flex flex-wrap gap-2">
                        {['All', 'Active', 'Blocked'].map(s => (
                          <button
                            key={s}
                            onClick={() => { setFilters({ ...filters, status: s }); setCurrentPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${filters.status === s
                              ? 'bg-[#f0883e] text-black'
                              : 'bg-bg-deep border border-border-main text-text-dim hover:border-text-dim'
                              }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[8px] font-bold text-text-dim uppercase tracking-[0.2em]">Operational City</p>
                      <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                        {cities.map(c => (
                          <button
                            key={c}
                            onClick={() => { setFilters({ ...filters, city: c }); setCurrentPage(1); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-between ${filters.city === c
                              ? 'bg-[#f0883e]/10 text-[#f0883e]'
                              : 'text-text-dim hover:bg-bg-active'
                              }`}
                          >
                            {c}
                            {filters.city === c && <Check size={10} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-border-main">
                    <button
                      onClick={() => setShowAdvancedFilters(false)}
                      className="w-full py-3 bg-[#f0883e] text-black text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/10 active:scale-95 transition-all"
                    >
                      Apply Protocols
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card !p-0 flex-1 overflow-hidden shadow-2xl border border-border-main bg-bg-card/80 flex flex-col min-h-0 mt-2">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max relative">
            <thead className="sticky top-0 z-[40]">
              <tr className="bg-bg-card border-b border-border-main shadow-sm">
                {localColConfig.name && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Client Name</th>}
                {localColConfig.customId && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">ID Node</th>}
                {localColConfig.mobile && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Contact</th>}
                {localColConfig.email && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Email</th>}
                {localColConfig.gst && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">GSTIN</th>}
                {localColConfig.pan && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">PAN</th>}
                {localColConfig.bankAcc && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Account No.</th>}
                {localColConfig.ifsc && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">IFSC</th>}
                {localColConfig.status && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Risk</th>}
                {localColConfig.type && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Type</th>}
                {localColConfig.city && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">City</th>}
                {localColConfig.pin && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Pin</th>}
                {localColConfig.address && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Address</th>}
                {localColConfig.overdue && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-red-500 bg-bg-card">Overdue</th>}
                {localColConfig.control && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim text-right sticky right-0 bg-bg-card z-[41]">Ops</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(localColConfig).filter(Boolean).length} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em]">No {filterType} clients found matching your search</p>
                  </td>
                </tr>
              ) : paginatedData.map(c => (
                <tr
                  key={c._id}
                  onClick={() => handleViewAnalytics(c)}
                  className="hover:bg-bg-active transition-all group cursor-pointer"
                >
                  {localColConfig.name && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f0883e] to-[#ffab70] flex items-center justify-center text-black font-black text-[10px] shadow-lg">
                          {(c.name || '?')[0]}
                        </div>
                        <span className="font-black text-text-main text-[11px] tracking-tight group-hover:text-[#f0883e] transition-colors whitespace-nowrap">{c.name || 'Unknown'}</span>
                      </div>
                    </td>
                  )}
                  {localColConfig.customId && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim uppercase whitespace-nowrap">{c.customId || 'N/A'}</td>}
                  {localColConfig.mobile && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim whitespace-nowrap">{c.mobile || 'N/A'}</td>}
                  {localColConfig.email && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim whitespace-nowrap">{c.email || 'N/A'}</td>}
                  {localColConfig.gst && <td className="px-6 py-4 text-[10px] font-mono font-bold text-[#58a6ff] whitespace-nowrap">{c.gst || 'N/A'}</td>}
                  {localColConfig.pan && <td className="px-6 py-4 text-[10px] font-mono font-bold text-[#f0883e] whitespace-nowrap">{c.pan || 'N/A'}</td>}
                  {localColConfig.bankAcc && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim whitespace-nowrap">{c.bankAcc || 'N/A'}</td>}
                  {localColConfig.ifsc && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim uppercase whitespace-nowrap">{c.ifsc || 'N/A'}</td>}
                  {localColConfig.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${c.status === 'Active' ? 'bg-[#3fb950] shadow-[0_0_8px_#3fb950]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${c.status === 'Active' ? 'text-[#3fb950]' : 'text-red-500'}`}>{c.status}</span>
                      </div>
                    </td>
                  )}
                  {localColConfig.type && <td className="px-6 py-4 text-[9px] font-black text-text-dim uppercase whitespace-nowrap">{c.type}</td>}
                  {localColConfig.city && <td className="px-6 py-4 text-[9px] font-bold text-text-dim uppercase whitespace-nowrap">{c.city || 'N/A'}</td>}
                  {localColConfig.pin && <td className="px-6 py-4 text-[9px] font-mono text-text-dim whitespace-nowrap">{c.pin || 'N/A'}</td>}
                  {localColConfig.address && <td className="px-6 py-4 text-[9px] font-bold text-text-dim truncate max-w-[150px] whitespace-nowrap">{c.address || 'N/A'}</td>}
                  {localColConfig.overdue && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-mono font-bold text-red-500">
                        {formatINR((state.data.loans || []).filter(l => (l.customerId?._id || l.customerId) === c._id).reduce((sum, l) => {
                          const ovd = (l.schedule || []).filter(s => s.status === 'Pending' && new Date(s.dueDate) < new Date());
                          return sum + ovd.reduce((s, inst) => s + inst.emi, 0);
                        }, 0))}
                      </span>
                    </td>
                  )}
                  {localColConfig.control && (
                    <td className="px-6 py-4 text-right sticky right-0 bg-bg-card/95 backdrop-blur-md z-[30]">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => handleEditCustomer(c, e)} className="p-1.5 text-text-dim hover:text-[#f0883e] transition-all"><Edit3 size={14} /></button>
                        <button onClick={(e) => handleDeleteCustomer(c._id, e)} className="p-1.5 text-text-dim hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-bg-card border-t border-border-main p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
              Showing <span className="text-text-main">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-[#f0883e]">{filtered.length}</span> Nodes
            </p>
            <div className="flex items-center gap-2 border-l border-border-main pl-4">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-bg-deep border border-border-main rounded-lg text-[9px] font-black text-text-main px-2 py-1 outline-none focus:border-[#f0883e]"
              >
                {[5, 10, 25, 50].map(v => <option key={v} value={v}>{v} / Page</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 bg-bg-deep border border-border-main rounded-lg text-text-dim hover:text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                // Show first, last, and pages around current
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-[#f0883e] text-black shadow-lg shadow-orange-500/20' : 'bg-bg-deep border border-border-main text-text-dim hover:text-text-main'
                        }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-text-dim/50">...</span>;
                }
                return null;
              })}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 bg-bg-deep border border-border-main rounded-lg text-text-dim hover:text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
      />
    </div>
  );
};

const CustomerFormModal = ({ isOpen, onClose, customer }) => {
  const { numbering, security } = state.data;
  const [formData, setFormData] = useState({
    name: '', customId: '', mobile: '', email: '', status: 'Active', type: 'EMI',
    address: '', city: '', pin: '', gst: '', pan: '',
    bankAcc: '', ifsc: ''
  });
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [error, setError] = useState(null);

  const emailRef = useRef(null);
  const mobileRef = useRef(null);
  const [validationErrors, setValidationErrors] = useState({ email: '', mobile: '', customId: '' });

  const checkDuplicate = (field, value) => {
    if (!value) return;
    const exists = state.data.customers.some(c =>
      c._id !== (customer?._id) && c[field] === value
    );
    if (exists) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: `Protocol Conflict: This ${field === 'mobile' ? 'Mobile' : field === 'email' ? 'Email' : 'ID'} is already registered.`
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const verifyBank = async () => {
    if (!formData.ifsc) return showNotification('Please enter IFSC code', 'info');
    setIsVerifyingBank(true);
    setBankDetails(null);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${formData.ifsc.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        setBankDetails(data);
        showNotification(`Bank Node Verified: ${data.BANK}`, 'success');
      } else {
        showNotification('Invalid IFSC Code', 'error');
      }
    } catch (err) {
      showNotification('Verification Service Unavailable', 'error');
    } finally {
      setIsVerifyingBank(false);
    }
  };

  useEffect(() => {
    if (customer) {
      setFormData({ ...customer, type: customer.type || 'EMI' });
    } else {
      setFormData({
        name: '', customId: '', mobile: '', email: '', status: 'Active', type: 'EMI',
        address: '', city: '', pin: '', gst: '', pan: '',
        bankAcc: '', ifsc: ''
      });
    }
    setError(null);
    setValidationErrors({ email: '', mobile: '', customId: '' });
    setIsCaptchaVerified(false);
  }, [customer, isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation Protocols
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      showNotification('Invalid Email Structure', 'error');
      emailRef.current?.focus();
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.mobile)) {
      showNotification('Phone must be exactly 10 digits', 'error');
      mobileRef.current?.focus();
      return;
    }

    if (validationErrors.email || validationErrors.mobile || validationErrors.customId) {
      showNotification('Protocol Conflict: Resolve duplicates before execution', 'error');
      if (validationErrors.email) emailRef.current?.focus();
      else if (validationErrors.mobile) mobileRef.current?.focus();
      else document.getElementById('customId')?.focus();
      return;
    }

    if (security?.captcha?.onboardClient && !isCaptchaVerified && !customer) {
      return showNotification('Please complete captcha verification', 'error');
    }
    setError(null);
    try {
      if (customer) {
        await state.updateCustomer(customer._id, formData);
      } else {
        await state.addCustomer(formData);
      }
      showNotification(customer ? 'Profile Updated' : 'Client Onboarded Successfully', 'success');
      onClose();
    } catch (err) {
      const msg = err.message || 'Onboarding Protocol Failure';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Update Profile' : 'Client Onboarding'}
      subtitle="KYC & Compliance Protocol"
      maxWidth="max-w-6xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 px-1 pb-2">
        {/* ROW 1: PRIMARY IDENTITY */}
        <div className="grid grid-cols-4 gap-4">
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Legal Entity Name</p>
            <input
              type="text" id="name" value={formData.name} onChange={handleChange}
              placeholder="Full Registered Name"
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-text-main font-bold focus:border-[#f0883e] outline-none transition-all"
              required
            />
          </div>
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Customer ID</p>
              {numbering?.customer?.mode === 'Auto' && !customer && <span className="text-[7px] font-mono text-[#f0883e]">AUTO</span>}
            </div>
            <input
              type="text" id="customId" value={formData.customId}
              onChange={handleChange}
              onBlur={(e) => checkDuplicate('customId', e.target.value)}
              disabled={numbering?.customer?.mode === 'Auto' && !customer}
              placeholder={numbering?.customer?.mode === 'Auto' && !customer ? "SYSTEM-GEN" : "Manual ID"}
              className={`w-full bg-bg-deep border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none transition-all ${validationErrors.customId ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-border-main focus:border-[#f0883e]'} ${numbering?.customer?.mode === 'Auto' && !customer ? 'text-[#f0883e]/50 cursor-not-allowed italic' : 'text-text-main'}`}
              required={numbering?.customer?.mode === 'Manual'}
            />
            {validationErrors.customId && <p className="text-[7px] text-red-500 font-bold uppercase mt-1 animate-pulse">{validationErrors.customId}</p>}
          </div>
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Email Protocol</p>
            <input
              ref={emailRef}
              type="email" id="email" value={formData.email}
              onChange={handleChange}
              onBlur={(e) => checkDuplicate('email', e.target.value)}
              placeholder="user@domain.com"
              className={`w-full bg-bg-deep border rounded-xl px-3 py-2 text-xs text-text-main font-mono outline-none transition-all ${validationErrors.email ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-border-main focus:border-[#f0883e]'}`}
              required
            />
            {validationErrors.email && <p className="text-[7px] text-red-500 font-bold uppercase mt-1 animate-pulse">{validationErrors.email}</p>}
          </div>
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Contact Phone</p>
            <input
              ref={mobileRef}
              type="text" id="mobile" value={formData.mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) setFormData(prev => ({ ...prev, mobile: val }));
              }}
              onBlur={(e) => checkDuplicate('mobile', e.target.value)}
              maxLength={10} placeholder="10 Digits"
              className={`w-full bg-bg-deep border rounded-xl px-3 py-2 text-xs text-text-main font-mono outline-none transition-all ${validationErrors.mobile ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'border-border-main focus:border-[#f0883e]'}`}
              required
            />
            {validationErrors.mobile && <p className="text-[7px] text-red-500 font-bold uppercase mt-1 animate-pulse">{validationErrors.mobile}</p>}
          </div>
        </div>

        {/* ROW 2: STATUS & TYPE & ADDRESS */}
        <div className="grid grid-cols-4 gap-4 items-end">
          <SearchableDropdown
            label="Compliance Status" options={['Active', 'Blocked']}
            selected={formData.status} onSelect={(val) => setFormData({ ...formData, status: val })}
          />
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Vertical Node</p>
            <div className="flex p-1 bg-bg-deep border border-border-main rounded-xl h-[34px]">
              {['EMI', 'Rental', 'FMC'].map(type => (
                <button
                  key={type} type="button" onClick={() => setFormData({ ...formData, type })}
                  className={`flex-1 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${formData.type === type ? 'bg-[#f0883e] text-black shadow-lg' : 'text-text-dim hover:text-text-main'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Corporate Address</p>
            <input
              type="text" id="address" value={formData.address} onChange={handleChange}
              placeholder="Site/Office HQ Location..."
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-text-main focus:border-[#f0883e] outline-none transition-all"
            />
          </div>
        </div>

        {/* ROW 3: LOGISTICS & SETTLEMENT MIXED */}
        <div className="grid grid-cols-4 gap-4">
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Operational City</p>
            <input
              type="text" id="city" value={formData.city} onChange={handleChange}
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-text-main font-bold focus:border-[#f0883e] outline-none"
            />
          </div>
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider">Pin Code</p>
            <input
              type="text" id="pin" value={formData.pin} onChange={handleChange}
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-text-main font-mono font-bold focus:border-[#f0883e] outline-none"
            />
          </div>
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider text-[#58a6ff]">Bank Account</p>
            <input
              type="text" id="bankAcc" value={formData.bankAcc} onChange={handleChange}
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-text-main font-mono font-bold focus:border-[#58a6ff] outline-none"
              placeholder="0000000000"
            />
          </div>
          <div className="group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-wider text-[#58a6ff]">IFSC Protocol</p>
            <div className="relative">
              <input
                type="text" id="ifsc" value={formData.ifsc} onChange={handleChange}
                className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-text-main font-mono font-bold focus:border-[#58a6ff] outline-none uppercase pr-10"
                placeholder="BANK001"
              />
              <button
                type="button" onClick={verifyBank} disabled={isVerifyingBank}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#58a6ff] hover:text-white transition-colors"
              >
                {isVerifyingBank ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* ROW 4: TAX & CAPTCHA */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <div className="col-span-1 group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-widest">Tax ID (GSTIN)</p>
            <input
              type="text" id="gst" value={formData.gst} onChange={handleChange}
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-[#58a6ff] font-mono font-bold focus:border-[#58a6ff] outline-none uppercase transition-all"
              placeholder="GSTIN"
            />
          </div>
          <div className="col-span-1 group">
            <p className="text-[9px] font-bold text-text-dim mb-1 uppercase tracking-widest">Permanent Account (PAN)</p>
            <input
              type="text" id="pan" value={formData.pan} onChange={handleChange}
              className="w-full bg-bg-deep border border-border-main rounded-xl px-3 py-2 text-xs text-[#f0883e] font-mono font-bold focus:border-[#f0883e] outline-none uppercase transition-all"
              placeholder="PAN"
            />
          </div>
          <div className="col-span-2">
            {security?.captcha?.onboardClient && !customer && (
              <div className="scale-90 origin-right">
                <Captcha onVerify={setIsCaptchaVerified} />
              </div>
            )}
          </div>
        </div>

        {/* BANK PREVIEW MINI */}
        {bankDetails && (
          <div className="bg-[#58a6ff]/5 border border-[#58a6ff]/20 rounded-xl px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <Building2 size={14} className="text-[#58a6ff]" />
              <p className="text-[9px] font-black text-text-main uppercase">{bankDetails.BANK} — <span className="text-text-dim font-bold">{bankDetails.BRANCH}</span></p>
            </div>
            <p className="text-[8px] font-mono text-[#58a6ff] font-black">{bankDetails.CITY}, {bankDetails.STATE}</p>
          </div>
        )}

        {/* ERROR SUMMARY */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 flex items-center gap-3 animate-pulse">
            <AlertCircle size={12} className="text-red-500" />
            <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shadow-[0_0_8px_#3fb950]" />
            <span className="text-[8px] font-black text-[#444c56] uppercase tracking-widest">Compliance Protocol Active</span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onClose} className="px-6 py-2 text-[10px] font-black text-[#768390] uppercase tracking-widest hover:text-white transition-all">Dismiss</button>
            <button type="submit" className="px-10 py-3 bg-[#f0883e] text-black text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">Execute Onboarding</button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerManagement;
