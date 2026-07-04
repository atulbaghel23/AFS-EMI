import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import { showNotification, confirmAction, hasPermission } from '../utils';
import Pagination from './Pagination.jsx';
import { usePersistentState } from '../hooks/usePersistentState';
import Modal from './Modal.jsx';
import {
  X, Download, Cpu, Zap, Settings, FileText, Maximize2,
  Info, Calendar, Weight, History, Box, Truck, DollarSign, ShieldCheck, ExternalLink,
  HardHat, Eye, Edit3, Trash2, Plus, Search, ChevronDown, UploadCloud, FileCode, BookOpen,
  Paperclip, Check, Settings2, Hash, LayoutGrid, List, RefreshCw, CheckCircle2,
  ChevronLeft, ChevronRight, Shield, CreditCard, TrendingUp, AlertCircle, Clock
} from 'lucide-react';

const MachineManagement = () => {
  const { machines = [], machineListView, user, systemConfig } = state.data;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [detailMachine, setDetailMachine] = useState(null);

  const isAdmin = user?.role === 'OEM' || user?.role === 'Admin';
  const [localColConfig, setLocalColConfig] = usePersistentState('machine_col_config', { identity: true, status: true, specs: true, valuation: true, dataSync: true, control: true });
  const [showColConfig, setShowColConfig] = useState(false);
  const colConfigRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colConfigRef.current && !colConfigRef.current.contains(event.target)) {
        setShowColConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [serverData, setServerData] = useState({ machines: [], total: 0, loading: false });
  const [searchTerm, setSearchTerm] = usePersistentState('machine_search', '');
  const [categoryFilter, setCategoryFilter] = usePersistentState('machine_category', 'All Categories');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [activePartition, setActivePartition] = useState('All');
  const globalConfig = systemConfig?.machineColumns || localColConfig;

  const fetchServerMachines = async () => {
    const isCustomer = user?.role === 'CUSTOMER' || (user?.role !== 'OEM' && user?.role !== 'Admin' && user?.role !== 'SUPERVISOR');
    if (isCustomer) return;
    setServerData(prev => ({ ...prev, loading: true }));
    try {
      const url = new URL(`${state.apiUrl}/machines`);
      url.searchParams.append('paginated', 'true');
      url.searchParams.append('page', currentPage);
      url.searchParams.append('limit', itemsPerPage);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      if (categoryFilter && categoryFilter !== 'All Categories') url.searchParams.append('category', categoryFilter);

      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${state.token}` } });
      const data = await res.json();
      if (res.ok) {
        setServerData({
          machines: Array.isArray(data.machines) ? data.machines : (Array.isArray(data) ? data : []),
          total: data.total || (Array.isArray(data) ? data.length : 0),
          loading: false
        });
      }
    } catch (e) {
      console.error("Failed to fetch machines via backend pagination:", e);
      setServerData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const isCustomer = user?.role === 'CUSTOMER' || (!isAdmin && user?.role !== 'SUPERVISOR');
    if (isCustomer && machines.length === 0) {
      state.ensureMachinesLight();
    }
  }, [user, machines.length, isAdmin]);

  useEffect(() => {
    const isCustomer = user?.role === 'CUSTOMER' || (user?.role !== 'OEM' && user?.role !== 'Admin' && user?.role !== 'SUPERVISOR');
    if (!isCustomer) {
      fetchServerMachines().then(() => {
        const container = document.getElementById('asset-scroll-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      const container = document.getElementById('asset-scroll-container');
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, itemsPerPage, searchTerm, categoryFilter, user]);

  const toggleColumn = (key) => {
    const newConfig = { ...localColConfig, [key]: !localColConfig[key] };
    setLocalColConfig(newConfig);
  };

  const handleAddMachine = () => {
    setEditingMachine(null);
    setIsModalOpen(true);
  };

  const handleEditMachine = (machine) => {
    setEditingMachine(machine);
    setIsModalOpen(true);
  };

  const handleDeleteMachine = async (id) => {
    const confirmed = await confirmAction(
      'Decommission Asset?',
      'This will permanently remove the equipment from the active node.',
      'warning'
    );

    if (confirmed) {
      const result = await state.deleteMachine(id);
      if (result.success) {
        showNotification('Asset decommissioned', 'success');
        fetchServerMachines();
      } else {
        showNotification(`Deletion Failed: ${result.message}`, 'error');
      }
    }
  };

  if (detailMachine) {
    return (
      <MachineDetailModal
        machine={detailMachine}
        onClose={() => setDetailMachine(null)}
      />
    );
  }

  let baseMachines = machines;

  const isCustomer = user?.role === 'CUSTOMER' || (!isAdmin && user?.role !== 'SUPERVISOR');

  if (isCustomer) {
    const userCustId = (user?.customerId?._id || user?.customerId)?.toString();

    // Show financed machines (even if invoice is pending)
    const clientLoans = (state.data.loans || []).filter(l => {
      const loanCustId = (l.customerId?._id || l.customerId)?.toString();
      return loanCustId && userCustId && loanCustId === userCustId;
    });

    const myMachineIdsStr = clientLoans.map(l => l.machineId?.toString()).filter(Boolean);
    const myMachineNames = clientLoans.map(l => (l.machineName || '').toLowerCase().trim());

    // Show FMC contracted machines
    const myContracts = (state.data.fmcContracts || []).filter(c =>
      (c.customerId && userCustId && c.customerId.toString() === userCustId) ||
      (c.customerName === user?.name)
    );

    baseMachines = [];
    clientLoans.forEach(l => {
       const masterMachine = machines.find(m => m._id?.toString() === l.machineId?.toString() || (m.name || '').toLowerCase().trim() === (l.machineName || '').toLowerCase().trim());
       if (masterMachine) {
          baseMachines.push({ ...masterMachine, _assetId: l._id, _loan: l });
       }
    });

    myContracts.forEach(c => {
       (c.machines || []).forEach(mId => {
          console.log("FMC Contract machine ID:", mId, "type:", typeof mId);
          const masterMachine = machines.find(m => {
             const isMatch = m._id?.toString() === mId.toString();
             if (isMatch) console.log("FMC Match SUCCESS:", m._id, m.name);
             return isMatch;
          });
          if (masterMachine) {
             baseMachines.push({ ...masterMachine, _assetId: c._id + '_' + masterMachine._id, _fmc: c });
          } else {
             console.log("FMC Match FAILED for machine ID:", mId, "against catalog of size:", machines.length);
          }
       });
    });
    console.log("DEBUG: Customer FMC contracts:", myContracts, "baseMachines:", baseMachines, "machines catalog:", machines);
  }

  const systemCategories = Array.isArray(state.data.categories)
    ? state.data.categories.map(c => typeof c === 'object' ? c.cat_name : c).filter(Boolean)
    : [];

  const syncedCategories = ['All Categories', ...new Set([
    ...systemCategories,
    ...baseMachines.map(m => m.category || 'Uncategorized')
  ])];

  // Filter by Partition Tab (EMI, Rental, FMC)
  const partitionedMachines = baseMachines.filter(m => {
    if (!isCustomer) return true;
    if (activePartition === 'All') return true;
    if (activePartition === 'EMI') {
      return m._loan && m._loan.financingType !== 'Rental';
    }
    if (activePartition === 'Rental') {
      return m._loan && m._loan.financingType === 'Rental';
    }
    if (activePartition === 'FMC') {
      return !!m._fmc;
    }
    return true;
  });

  // Pagination Logic
  const safeSearch = searchTerm || '';
  const filteredMachines = partitionedMachines.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(safeSearch.toLowerCase()) ||
      m.model?.toLowerCase().includes(safeSearch.toLowerCase()) ||
      m.category?.toLowerCase().includes(safeSearch.toLowerCase());
    const mCat = m.category || 'Uncategorized';
    const matchesCategory = categoryFilter === 'All Categories' || mCat.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const totalItems = isCustomer ? filteredMachines.length : (serverData?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedData = isCustomer
    ? filteredMachines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : (serverData?.machines || []);



  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] overflow-hidden flex flex-col">
      <div className="flex flex-col gap-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-text-main tracking-tighter uppercase italic flex items-center gap-3">
              <Cpu className="text-[#f0883e]" size={32} /> Asset Inventory
            </h2>
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <ShieldCheck size={12} className="text-[#3fb950]" /> Fleet Asset & Configuration Hub
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-tabs">
              <div className="tab-indicator" style={{
                left: machineListView === 'card' ? '0px' : '50%',
                width: '50%',
                opacity: 1
              }}></div>
              <button
                className={`glass-tab ${machineListView === 'card' ? 'active' : ''}`}
                onClick={() => state.setState({ machineListView: 'card' })}
              >
                <LayoutGrid size={14} className="mr-2" /> Cards
              </button>
              <button
                className={`glass-tab ${machineListView === 'list' ? 'active' : ''}`}
                onClick={() => state.setState({ machineListView: 'list' })}
              >
                <List size={14} className="mr-2" /> List
              </button>
            </div>

            {machineListView === 'list' && (
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
                  <div className="absolute top-full right-0 mt-3 w-72 bg-bg-card border border-border-main rounded-2xl shadow-2xl z-[60] p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">View Protocols</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'identity', label: 'Asset Identity', icon: <Cpu size={10} /> },
                        { id: 'specs', label: 'Specifications', icon: <Zap size={10} /> },
                        { id: 'valuation', label: 'Valuation', icon: <DollarSign size={10} /> },
                        { id: 'dataSync', label: 'Data Sync', icon: <RefreshCw size={10} /> },
                        { id: 'control', label: 'Operational Control', icon: <Settings2 size={10} /> }
                      ].map(col => (
                        <button
                          key={col.id}
                          onClick={() => toggleColumn(col.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-[8px] font-black uppercase transition-all ${localColConfig[col.id] ? 'bg-[#f0883e]/10 text-[#f0883e]' : 'bg-bg-deep text-text-dim hover:text-slate-400'
                            }`}
                        >
                          {localColConfig[col.id] ? <Check size={10} /> : <div className="w-[10px] h-[10px] border border-slate-700 rounded-sm" />}
                          {col.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${state.apiUrl}/machines/sync`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${state.token}` }
                  });
                  if (res.ok) {
                    showNotification('Products synced successfully', 'success');
                    await state.fetchData();
                  } else {
                    showNotification('Failed to sync products', 'error');
                  }
                } catch (e) {
                  showNotification('Sync error', 'error');
                }
              }}
              className="px-6 py-3 bg-[#30363d] text-white text-xs font-black rounded-xl hover:bg-[#444c56] transition-all border border-[#30363d] active:scale-95 uppercase tracking-widest flex items-center gap-2"
            >
              <RefreshCw size={16} className="text-[#f0883e]" /> SYNC ASSETS
            </button>
            {hasPermission(user, 'machines', 'create') && (
              <button onClick={handleAddMachine} className="px-8 py-3 bg-[#f0883e] text-black text-xs font-black rounded-xl hover:bg-[#f0883e]/90 transition-all shadow-[0_0_20px_rgba(240,136,62,0.15)] active:scale-95 uppercase tracking-widest flex items-center gap-2">
                <Plus size={16} /> AUTHORIZE ASSET
              </button>
            )}
          </div>
        </div>

      {isCustomer && (
        <div className="flex border-b border-border-main pb-px gap-6 flex-shrink-0 mb-2">
          {[
            { id: 'All', label: 'All Assets' },
            { id: 'EMI', label: 'EMI Machines' },
            { id: 'Rental', label: 'Rental Machines' },
            { id: 'FMC', label: 'FMC Machines' }
          ].map(tab => {
            const isActive = activePartition === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActivePartition(tab.id);
                  setCurrentPage(1);
                }}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                  isActive ? 'text-[#f0883e]' : 'text-text-dim hover:text-text-main'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f0883e] rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-bg-card/50 border border-border-main rounded-2xl">
          <div className="w-full sm:w-64 relative">
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-4 pr-10 py-3 bg-bg-deep border border-border-main rounded-xl text-xs text-text-main font-bold focus:border-[#f0883e] outline-none transition-all appearance-none cursor-pointer"
            >
              {syncedCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-dim">
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Asset Name, Model, or Category..."
              className="w-full pl-10 pr-4 py-3 bg-bg-deep border border-border-main rounded-xl text-xs text-text-main font-bold focus:border-[#f0883e] outline-none transition-all placeholder:text-text-dim"
            />
          </div>
        </div>
      </div>

      {machineListView === 'card' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div id="asset-scroll-container" className="flex-1 overflow-y-auto no-scrollbar pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {paginatedData.map(m => (
                <MachineCard
                  key={m._assetId || m._id}
                  machine={m}
                  user={user}
                  onEdit={() => handleEditMachine(m)}
                  onDelete={() => handleDeleteMachine(m._id)}
                  onView={() => setDetailMachine(m)}
                />
              ))}
            </div>
          </div>
          {/* Pagination Footer */}
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            itemName="Assets"
            className="bg-bg-card border border-border-main p-4 flex flex-col sm:flex-row items-center justify-between flex-shrink-0 mt-4 rounded-xl shadow-lg gap-4 sm:gap-0"
          />
        </div>
      ) : (
        <div className="glass-card !p-0 flex-1 overflow-hidden shadow-2xl border border-border-main bg-bg-card/80 flex flex-col min-h-0 mt-2">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max relative">
              <thead className="sticky top-0 z-[40]">
                <tr className="bg-bg-card border-b border-border-main shadow-sm">
                  {localColConfig.identity && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Asset Identity</th>}
                  {localColConfig.specs && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Specifications</th>}
                  {localColConfig.valuation && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">{isCustomer ? 'Invoice Details' : 'Valuation'}</th>}
                  {localColConfig.dataSync && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Data Sync</th>}
                  {localColConfig.control && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim text-right sticky right-0 bg-bg-card z-[41]">Ops</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-20 text-center text-[10px] font-bold text-text-dim uppercase tracking-widest">
                      No assets found matching your query
                    </td>
                  </tr>
                ) : paginatedData.map(m => (
                  <tr key={m._assetId || m._id} className="hover:bg-bg-active transition-all group cursor-pointer" onClick={() => setDetailMachine(m)}>
                    {localColConfig.identity && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-bg-deep border border-border-main shadow-2xl flex-shrink-0">
                            <img src={m.img || (m.images && m.images[0])} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" alt="" />
                          </div>
                          <div>
                            <div className="font-black text-text-main text-xs tracking-tight group-hover:text-[#f0883e] transition-colors">{m.name}</div>
                            <div className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                              {m.model}
                              <span className="w-1 h-1 rounded-full bg-[#3fb950]" />
                              <span className="text-[#f0883e]/70">{m.category}</span>
                            </div>
                            {m.serialNumber && (
                              <div className="text-[8px] font-mono font-bold text-text-dim uppercase mt-0.5 tracking-tighter">
                                S/N: <span className="text-text-main/60 group-hover:text-text-main transition-colors">{m.serialNumber}</span>
                              </div>
                            )}
                            {/* <div className="mt-1">
                              {m.isFromAPI ? (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[7px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                                  <UploadCloud size={8} /> API SYNCED
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20 text-[7px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                                  <CheckCircle2 size={8} /> FRONTEND
                                </span>
                              )}
                            </div> */}
                          </div>
                        </div>
                      </td>
                    )}

                    {localColConfig.specs && (
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-text-main uppercase">
                            <Zap size={10} className="text-[#f0883e]" />
                            {m.machineType}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-text-dim uppercase tracking-wider">
                            <span>{m.specs?.fuelType || 'DIESEL'} UNIT</span>
                            {m.specs?.horsePower && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border-main" />
                                <span className="text-text-main/80">{m.specs.horsePower}</span>
                              </>
                            )}
                          </div>
                          {m.specs?.engineModel && (
                            <div className="text-[8px] font-mono text-text-dim uppercase italic bg-bg-deep border border-border-main px-1.5 py-0.5 rounded inline-block w-fit mt-0.5">ENG: {m.specs.engineModel}</div>
                          )}
                        </div>
                      </td>
                    )}
                    {localColConfig.valuation && (
                      <td className="px-6 py-4">
                        {isCustomer ? (() => {
                          const userCustId = (user?.customerId?._id || user?.customerId)?.toString();
                          const machineLoan = m._loan;
                          const fmcContract = m._fmc;

                          const inv = machineLoan?.invoiceData || {};
                          const sNum = m.serialNumber || inv.serialNumber || machineLoan?.serialNumber || 'N/A';
                          const cNum = m.chassisNumber || inv.chassisNumber || 'N/A';
                          const invNum = m.invoiceNumber || inv.invoiceNumber || machineLoan?.invoiceNumber || inv.order_id || 'N/A';
                          const engNum = m.engineNumber || inv.engineNumber || m.specs?.engineModel || 'N/A';

                          return (
                            <div className="flex flex-col gap-1 text-[8px] font-mono font-bold text-text-dim uppercase tracking-wider">
                              {machineLoan ? (
                                <div className={machineLoan.financingType === 'Rental' ? "text-[#58a6ff] mb-0.5" : "text-[#3fb950] mb-0.5"}>
                                  {machineLoan.financingType === 'Rental' ? "RENTAL ASSET" : "FINANCED ASSET"}
                                </div>
                              ) : fmcContract ? (
                                <div className="text-[#58a6ff] mb-0.5">FMC CONTRACT</div>
                              ) : null}
                              <div className="flex justify-between"><span>INV: <span className="text-text-main">{invNum}</span></span></div>
                              <div className="text-[#f0883e]">CH: {cNum}</div>
                              <div className="text-[#f0883e]">SN: {sNum}</div>
                              <div>ENG: <span className="text-text-main">{engNum}</span></div>
                            </div>
                          );
                        })() : (
                          <>
                            <div className="font-mono font-black text-text-main text-[11px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded inline-block mb-1">₹{((m.pricing?.totalPrice || 0) / 100000).toFixed(2)}L</div>
                            <div className="flex flex-wrap items-center gap-2 text-[8px] font-bold text-text-dim uppercase tracking-widest mt-1">
                              <span>NSV: <span className="text-white">₹{((m.pricing?.oemNetSaleValue || 0) / 100000).toFixed(2)}L</span></span>
                              {m.pricing?.serviceCommission > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-border-main" />
                                  <span>SRV: <span className="text-white">₹{(m.pricing.serviceCommission / 100000).toFixed(2)}L</span></span>
                                </>
                              )}
                            </div>
                            {m.pricing?.commissionA > 0 && (
                              <div className="text-[8px] font-bold text-[#f0883e]/80 uppercase tracking-widest mt-1">
                                COMM A: <span className="text-[#f0883e]">₹{(m.pricing.commissionA / 100000).toFixed(2)}L</span>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )}
                    {localColConfig.dataSync && (
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-mono text-text-dim font-bold">
                          {new Date(m.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1 h-1 rounded-full bg-[#3fb950]" />
                          <span className="text-[8px] font-bold text-text-dim uppercase">Active</span>
                        </div>
                      </td>
                    )}
                    {localColConfig.control && (
                      <td className="px-6 py-4 text-right sticky right-0 bg-bg-card/95 backdrop-blur-md">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setDetailMachine(m); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-deep/50 text-text-dim hover:text-text-main hover:bg-bg-active border border-border-main transition-all">
                            <Eye size={14} />
                          </button>
                          {hasPermission(user, 'machines', 'update') && (
                            <button onClick={(e) => { e.stopPropagation(); handleEditMachine(m); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-deep/50 text-text-dim hover:text-[#f0883e] hover:bg-[#f0883e]/10 border border-border-main transition-all">
                              <Edit3 size={14} />
                            </button>
                          )}
                          {hasPermission(user, 'machines', 'delete') && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMachine(m._id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-deep/50 text-text-dim hover:text-rose-500 hover:bg-rose-500/10 border border-border-main transition-all">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            itemName="Assets"
            className="bg-bg-card border border-border-main p-4 flex flex-col sm:flex-row items-center justify-between flex-shrink-0 mt-4 rounded-xl shadow-lg gap-4 sm:gap-0"
          />
        </div>
      )}

      <MachineFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); fetchServerMachines(); }}
        machine={editingMachine}
      />
    </div>
  );
}; const MachineCard = ({ machine, onEdit, onDelete, onView, user }) => {
  const isCustomer = user?.role === 'CUSTOMER' || (user?.role !== 'OEM' && user?.role !== 'Admin' && user?.role !== 'SUPERVISOR');
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = Array.from(new Set([...(machine.images || []), machine.img].filter(Boolean)));
  if (images.length === 0) images.push('/logo.png');

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImgIndex(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="group bg-bg-card border border-border-main rounded-xl flex flex-col h-full hover:border-[#f0883e]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/5 relative">

      <div className="relative h-40 rounded-t-xl overflow-hidden bg-black cursor-pointer" onClick={onView}>
        <div className="w-full h-full relative">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 transform group-hover:scale-110 ${i === currentImgIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              alt={machine.name}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent opacity-60" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="px-2 py-0.5 rounded bg-[#f0883e] text-black text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">{machine.category || 'ASSET'}</span>
          <span className="px-2 py-0.5 rounded bg-bg-card/80 backdrop-blur-md text-text-main text-[8px] font-mono border border-border-main">ASSET-{machine._id.substring(machine._id.length - 4).toUpperCase()}</span>
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1.5 bg-bg-card/90 backdrop-blur rounded-full border border-border-main text-[#f0883e]">
            <Maximize2 size={12} />
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-black text-text-main truncate group-hover:text-[#f0883e] transition-colors relative z-10">{machine.name || 'Undefined Asset'}</h3>
            {!isCustomer && <span className="text-[10px] font-mono font-bold text-[#f0883e] italic relative z-10">₹{((machine.pricing?.totalPrice || 0) / 100000).toFixed(1)}L</span>}
          </div>
          <p className="text-[10px] text-text-dim font-bold uppercase tracking-[0.1em] relative z-10">{machine.model || 'N/A MODEL'}</p>

          {isCustomer ? (
            <div className="mt-3 p-2 bg-bg-deep border border-border-main rounded-lg relative z-10">
              {(() => {
                const machineLoan = machine._loan;
                const fmcContract = machine._fmc;

                const inv = machineLoan?.invoiceData || {};
                const sNum = machine.serialNumber || inv.serialNumber || machineLoan?.serialNumber || 'N/A';
                const cNum = machine.chassisNumber || inv.chassisNumber || 'N/A';
                const invNum = machine.invoiceNumber || inv.invoiceNumber || machineLoan?.invoiceNumber || inv.order_id || 'N/A';
                const engNum = machine.engineNumber || inv.engineNumber || machine.specs?.engineModel || 'N/A';

                return (
                  <div className="flex flex-col gap-1 text-[8px] font-mono font-bold text-text-dim uppercase tracking-wider">
                    {machineLoan ? (
                      <div className="flex justify-between mb-1 border-b border-border-main pb-1">
                        <span className={machineLoan.financingType === 'Rental' ? "text-[#58a6ff]" : "text-[#3fb950]"}>
                          {machineLoan.financingType === 'Rental' ? "RENTAL ASSET" : "FINANCED ASSET"}
                        </span>
                        <span className="text-[#f0883e]">₹{((machineLoan.emi || 0)).toLocaleString()}/m</span>
                      </div>
                    ) : fmcContract ? (
                      <div className="flex justify-between mb-1 border-b border-border-main pb-1">
                        <span className="text-[#58a6ff]">FMC CONTRACTED</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between mt-1"><span>INV: <span className="text-text-main">{invNum}</span></span></div>
                    <div className="text-[#f0883e]">CH: {cNum}</div>
                    <div className="text-[#f0883e]">SN: {sNum}</div>
                    <div>ENG: <span className="text-text-main">{engNum}</span></div>
                    {inv.invoiceDate && <div className="text-emerald-500 mt-1">INV DATE: {new Date(inv.invoiceDate).toLocaleDateString()}</div>}
                  </div>
                );
              })()}
            </div>
          ) : (
            machine.serialNumber && (
              <div className="mt-2 py-1 px-2 bg-bg-deep border border-border-main rounded-md inline-block relative z-10">
                <p className="text-[8px] font-mono font-bold text-text-dim uppercase tracking-tighter">
                  S/N: <span className="text-text-main/60 group-hover:text-[#f0883e] transition-colors">{machine.serialNumber}</span>
                </p>
              </div>
            )
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between relative z-10">
          <div className="flex gap-3 text-text-dim">
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-[#f0883e]" />
              <span className="text-[9px] font-mono font-bold">{machine.specs?.horsePower || '280'} HP</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings size={10} />
              <span className="text-[9px] font-mono font-bold">{machine.specs?.transmissionType?.split(' ')[0] || 'AUTO'}</span>
            </div>
          </div>

          <div className="flex gap-1.5">
            <button onClick={onView} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-deep text-text-dim hover:text-text-main hover:bg-bg-active border border-border-main transition-all">
              <Eye size={14} />
            </button>
            {hasPermission(user, 'machines', 'update') && (
              <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-deep text-text-dim hover:text-[#f0883e] hover:bg-[#f0883e]/10 border border-border-main transition-all">
                <Edit3 size={14} />
              </button>
            )}
            {hasPermission(user, 'machines', 'delete') && (
              <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-deep text-text-dim hover:text-rose-500 hover:bg-rose-500/5 border border-border-main transition-all">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MachineListView = ({ machines, onEdit, onDelete, onView }) => (
  <div className="glass-card !p-0 overflow-hidden shadow-2xl">
    <div className="overflow-x-auto">
      <table className="w-full text-left compact-table">
        <thead>
          <tr>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Config</th>
            <th className="px-4 py-3 text-right">Operational Control</th>
          </tr>
        </thead>
        <tbody>
          {machines.map(m => (
            <tr key={m._id} className="hover:bg-white/[0.02] transition-all group">
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-black border border-white/10">
                    <img src={m.img || (m.images && m.images[0]) || '/logo.png'} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 dark:text-white text-[0.6875rem] truncate max-w-[150px]">{m.name}</div>
                    <div className="text-[0.5rem] font-black text-[#FFB800] uppercase tracking-widest">{m.model}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2">
                <span className="status-badge !bg-white/5 !text-slate-400 !border-white/10">{m.category}</span>
              </td>
              <td className="px-4 py-2">
                <div className="font-black text-slate-300 text-[0.625rem] uppercase tracking-tighter">{m.machineType}</div>
                <div className="text-[0.5rem] text-slate-500 font-bold">₹{((m.pricing?.totalPrice || 0) / 100000).toFixed(1)}L</div>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onView(m)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all cursor-pointer">
                    <i className="fas fa-eye text-[0.625rem]"></i>
                  </button>
                  <button onClick={() => onEdit(m)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-500 hover:text-[#FFB800] transition-all cursor-pointer">
                    <i className="fas fa-edit text-[0.625rem]"></i>
                  </button>
                  <button onClick={() => onDelete(m._id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-500 hover:text-rose-500 transition-all cursor-pointer">
                    <i className="fas fa-trash text-[0.625rem]"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SearchableDropdown = ({ label, options, selected, onSelect, onAddNew, onDeleteOption, onEditOption, isOptionDeletable }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={dropdownRef} className="relative">
      <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">{label}</p>
      <div
        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-bold cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected || 'Select option...'}
        <ChevronDown size={14} />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#0d1117] border border-[#30363d] rounded-lg shadow-xl max-h-48 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-[#0d1117] border-b border-[#30363d]">
            <input
              className="w-full bg-transparent px-4 py-2 text-sm text-white focus:outline-none"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredOptions.slice(0, 50).map((opt) => (
            <div key={opt} className="px-4 py-2 text-xs hover:bg-[#30363d] cursor-pointer flex justify-between items-center" onClick={() => { onSelect(opt); setIsOpen(false); }}>
              {opt}
              {isOptionDeletable?.(opt) && (
                <Trash2 size={12} className="text-rose-500" onClick={(e) => { e.stopPropagation(); onDeleteOption(opt); }} />
              )}
            </div>
          ))}
          {onAddNew && search && !options.includes(search) && (
            <div className="px-4 py-2 text-xs text-[#f0883e] hover:bg-[#30363d] cursor-pointer" onClick={() => { onAddNew(search); setIsOpen(false); }}>
              + Add "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MachineFormModal = ({ isOpen, onClose, machine }) => {
  const [activeTab, setActiveTab] = useState('BASIC INFO');
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    category: '', name: '', model: '', machineType: '',
    serialNumber: '', chassisNumber: '', engineNumber: '', invoiceNumber: '',
    images: [], pricing: { totalPrice: 0, oemNetSaleValue: 0, commissionA: 0, commissionB: 0, serviceCommission: 0 },
    specs: { fuelType: 'Diesel', horsePower: '', cylinders: '', year: '2024', unladenWeight: '', engineModel: '', ratedPowerKw: '', driveType: '2WD', transmissionType: '' },
    attachments: [], warranty: { standardMonths: 12, standardHours: 2000, extendedMonths: 6, extendedHours: 1600 },
    documents: []
  });

  useEffect(() => {
    if (machine) {
      setFormData({ ...machine });
    } else {
      setFormData({
        category: (typeof state.data.categories[0] === 'string' ? state.data.categories[0] : state.data.categories[0]?.cat_name) || '',
        name: '', model: '',
        machineType: state.data.dieselTypes[0] || '',
        serialNumber: '', chassisNumber: '', engineNumber: '', invoiceNumber: '',
        images: [''],
        pricing: { totalPrice: 0, oemNetSaleValue: 0, commissionA: 0, commissionB: 0, serviceCommission: 0 },
        specs: { fuelType: 'Diesel', horsePower: '', cylinders: '', year: '2024', unladenWeight: '', engineModel: '', ratedPowerKw: '', driveType: '2WD', transmissionType: state.data.transmissionTypes[0] || '' },
        attachments: [],
        warranty: { standardMonths: 12, standardHours: 2000, extendedMonths: 6, extendedHours: 1600 },
        documents: []
      });
    }
  }, [machine, isOpen]);

  const handleSave = async () => {
    if (!formData.name || !formData.model) {
      showNotification('Name and Model are required', 'error');
      return;
    }
    const result = machine
      ? await state.updateMachine(machine._id, formData)
      : await state.addMachine(formData);

    if (result.success) {
      showNotification(machine ? 'Asset Updated' : 'New Asset Authorized', 'success');
      onClose();
    } else {
      showNotification(result.message, 'error');
    }
  };

  const tabs = [
    { id: 'BASIC INFO', label: 'Basic Info', icon: Info },
    { id: 'PRICING', label: 'Pricing', icon: DollarSign },
    { id: 'SPECIFICATIONS', label: 'Specifications', icon: Settings },
    { id: 'ATTACHMENTS', label: 'Attachments', icon: Paperclip },
    { id: 'WARRANTY', label: 'Warranty', icon: Shield }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={machine ? 'Edit Asset' : 'Register Asset'}
      subtitle="Fleet Asset Terminal"
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col min-h-[500px] h-[60vh]">
        <nav className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-[#30363d] mb-4 shrink-0">
          {tabs.map((step) => {
            const Icon = step.icon;
            const isActive = activeTab === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveTab(step.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[10px] font-bold transition-all shrink-0 border ${isActive
                  ? 'bg-[#f0883e]/10 border-[#f0883e]/50 text-[#f0883e]'
                  : 'bg-transparent border-transparent text-[#768390] hover:bg-[#30363d]/50'
                  }`}
              >
                <Icon size={14} className={isActive ? 'text-[#f0883e]' : 'text-[#444c56]'} />
                {step.id}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pr-2 pb-4">
          {activeTab === 'BASIC INFO' && <BasicTab formData={formData} setFormData={setFormData} fileInputRef={fileInputRef} />}
          {activeTab === 'PRICING' && <PricingTab formData={formData} setFormData={setFormData} />}
          {activeTab === 'SPECIFICATIONS' && <SpecsTab formData={formData} setFormData={setFormData} />}
          {activeTab === 'ATTACHMENTS' && <AttachmentsTab formData={formData} setFormData={setFormData} />}
          {activeTab === 'WARRANTY' && <WarrantyTab formData={formData} setFormData={setFormData} />}
        </div>

        <footer className="mt-4 pt-6 border-t border-[#30363d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[9px] font-mono text-[#444c56] uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            Sync Active
          </div>
          <div className="flex gap-4">
            {activeTab !== 'BASIC INFO' && (
              <button
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  setActiveTab(tabs[currentIndex - 1].id);
                }}
                className="px-6 py-2.5 text-[10px] font-bold text-[#768390] hover:text-white transition-colors uppercase tracking-widest border border-[#30363d] rounded-lg"
              >
                Previous Step
              </button>
            )}

            {activeTab !== 'WARRANTY' ? (
              <button
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  setActiveTab(tabs[currentIndex + 1].id);
                }}
                className="px-8 py-2.5 bg-[#30363d] text-white font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-[#444c56] transition-all"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-10 py-2.5 bg-[#f0883e] text-black font-black rounded-lg text-[10px] uppercase tracking-widest hover:bg-[#ffab70] transition-all shadow-xl shadow-orange-500/20 active:scale-95"
              >
                {machine ? 'SAVE ASSET' : 'CONFIRM ASSET'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  );
};

const BasicTab = ({ formData, setFormData, fileInputRef }) => {
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, images: [...(formData.images || []), reader.result] });
      };
      reader.readAsDataURL(file);
    }
  };
  const { categories, dieselTypes, evTypes } = state.data;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
      <div className="space-y-6 p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10">
        <h3 className="text-xs font-black text-[#FFB800] uppercase tracking-widest">Master Identity</h3>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">Machine Name</p>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. HEX-Loder"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-bold focus:border-[#f0883e] outline-none"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">Machine Model</p>
            <input
              type="text"
              value={formData.model}
              onChange={e => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g. LOW-831"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-mono focus:border-[#f0883e] outline-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-[#768390] uppercase tracking-wider">Category</p>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const res = await fetch(`${state.apiUrl}/machines/categories/sync`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${state.token}` }
                    });
                    if (res.ok) {
                      showNotification('Categories synced successfully', 'success');
                      // Fetch just categories to avoid full reload
                      const catRes = await fetch(`${state.apiUrl}/machines/categories`, {
                        headers: { Authorization: `Bearer ${state.token}` }
                      });
                      if (catRes.ok) {
                        const newCats = await catRes.json();
                        state.setState({ categories: newCats });
                      }
                    } else {
                      showNotification('Failed to sync categories', 'error');
                    }
                  } catch (e) {
                    showNotification('Sync error', 'error');
                  }
                }}
                className="text-[9px] font-bold text-[#f0883e] flex items-center gap-1 hover:text-[#ffab70] transition-colors uppercase"
              >
                <RefreshCw size={10} /> Sync
              </button>
            </div>
            <SearchableDropdown
              label=""
              options={(categories || []).map(c => typeof c === 'string' ? c : c.cat_name)}
              selected={formData.category}
              onSelect={(val) => setFormData({ ...formData, category: val })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-100 dark:border-white/10 pt-4">
            <div>
              <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">Serial Number</p>
              <input type="text" value={formData.serialNumber || ''} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} placeholder="SN-..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-mono focus:border-[#f0883e] outline-none" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">Chassis Number</p>
              <input type="text" value={formData.chassisNumber || ''} onChange={e => setFormData({ ...formData, chassisNumber: e.target.value })} placeholder="CH-..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-mono focus:border-[#f0883e] outline-none" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">Engine Number</p>
              <input type="text" value={formData.engineNumber || ''} onChange={e => setFormData({ ...formData, engineNumber: e.target.value })} placeholder="ENG-..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-mono focus:border-[#f0883e] outline-none" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#768390] mb-1.5 uppercase tracking-wider">Invoice Number</p>
              <input type="text" value={formData.invoiceNumber || ''} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} placeholder="INV-..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-sm text-white font-mono focus:border-[#f0883e] outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0d1117]/30 border border-[#30363d] rounded-[1.5rem] p-6 space-y-4">
        <h3 className="text-[11px] font-bold text-[#f0883e] tracking-[0.2em] uppercase">Technical Specifications</h3>
        <SearchableDropdown
          label="Power Source"
          options={['Diesel', 'Electric (EV)']}
          selected={formData.specs?.fuelType}
          onSelect={(val) => setFormData({ ...formData, specs: { ...formData.specs, fuelType: val } })}
        />
        <SearchableDropdown
          label={formData.specs?.fuelType === 'Electric (EV)' ? 'EV Technology' : 'Emissions Standard'}
          options={formData.specs?.fuelType === 'Electric (EV)' ? evTypes : dieselTypes}
          selected={formData.machineType}
          onSelect={(val) => setFormData({ ...formData, machineType: val })}
          onAddNew={(val) => {
            if (formData.specs?.fuelType === 'Electric (EV)') {
              const newEv = [...state.data.evTypes, val];
              state.updateConfig({ evTypes: newEv });
            } else {
              const newDiesel = [...state.data.dieselTypes, val];
              state.updateConfig({ dieselTypes: newDiesel });
            }
            setFormData({ ...formData, machineType: val });
          }}
          onDeleteOption={(val) => {
            if (formData.specs?.fuelType === 'Electric (EV)') {
              const newEv = state.data.evTypes.filter(t => t !== val);
              state.updateConfig({ evTypes: newEv });
            } else {
              const newDiesel = state.data.dieselTypes.filter(t => t !== val);
              state.updateConfig({ dieselTypes: newDiesel });
            }
            if (formData.machineType === val) setFormData({ ...formData, machineType: '' });
          }}
          isOptionDeletable={(val) => !state.data.machines.some(m => m.machineType === val)}
          onEditOption={(oldVal, newVal) => {
            if (formData.specs?.fuelType === 'Electric (EV)') {
              const newEv = state.data.evTypes.map(t => t === oldVal ? newVal : t);
              state.updateConfig({ evTypes: newEv });
            } else {
              const newDiesel = state.data.dieselTypes.map(t => t === oldVal ? newVal : t);
              state.updateConfig({ dieselTypes: newDiesel });
            }
            if (formData.machineType === oldVal) setFormData({ ...formData, machineType: newVal });
          }}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-[#768390] uppercase tracking-wider">Media Gallery</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[9px] font-bold text-[#f0883e] hover:underline uppercase tracking-tighter"
            >
              Add Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar pr-2">
            {(formData.images || []).map((img, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[10px] font-mono group">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-6 h-6 rounded bg-bg-card overflow-hidden border border-border-main">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </div>
                  <span className="text-[#58a6ff] truncate">slot_0{i + 1}.jpg</span>
                </div>
                <Trash2
                  size={12}
                  onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })}
                  className="text-[#444c56] hover:text-[#f85149] cursor-pointer transition-colors"
                />
              </div>
            ))}
            {(!formData.images || formData.images.length === 0) && (
              <p className="text-[9px] text-[#444c56] italic">No visual assets attached</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PricingTab = ({ formData, setFormData }) => {
  const updatePricing = (field, value) => {
    setFormData({
      ...formData,
      pricing: { ...formData.pricing, [field]: parseFloat(value) || 0 }
    });
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      {[
        { label: 'Total Price (₹)', field: 'totalPrice', color: 'text-[#f0883e]' },
        { label: 'OEM Net Sale Value (₹)', field: 'oemNetSaleValue', color: 'text-white' },
        { label: 'Service Commission (₹)', field: 'serviceCommission', color: 'text-white' },
        { label: 'Sale Commission A (₹)', field: 'commissionA', color: 'text-[#3fb950]' },
        { label: 'Sale Commission B (₹)', field: 'commissionB', color: 'text-[#3fb950]' },
      ].map((item, i) => (
        <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 flex flex-col justify-between h-36 hover:border-[#768390] transition-all group">
          <span className="text-[10px] font-bold text-[#768390] uppercase tracking-widest mb-2 group-hover:text-[#f0883e] transition-colors">{item.label}</span>
          <div className="relative">
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-lg font-mono font-black ${item.color} opacity-50`}>₹</span>
            <input
              type="number"
              value={formData.pricing[item.field]}
              onChange={e => updatePricing(item.field, e.target.value)}
              className={`w-full bg-transparent border-none pl-6 text-2xl font-mono font-black tracking-tighter ${item.color} focus:outline-none`}
            />
          </div>
        </div>
      ))}
      <div className="bg-[#0d1117]/30 border border-dashed border-[#444c56] rounded-2xl p-6 flex items-center justify-center text-[#444c56] text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#30363d] hover:text-[#768390] transition-all">
        <Plus size={20} className="mr-2" /> Custom Metric
      </div>
    </div>
  );
};

const SpecsTab = ({ formData, setFormData }) => {
  const updateSpec = (field, value) => {
    setFormData({
      ...formData,
      specs: { ...formData.specs, [field]: value }
    });
  };
  const isEV = formData.specs.fuelType === 'Electric (EV)';
  const specs = [
    { label: 'Year of Manufacture', field: 'year', icon: Calendar },
    { label: 'Horse Power (HP)', field: 'horsePower', icon: Zap, disabled: isEV },
    { label: 'Cylinders', field: 'cylinders', icon: Settings, disabled: isEV },
    { label: 'Engine Model', field: 'engineModel', icon: Settings, disabled: isEV },
    { label: 'Unladen Weight (KG)', field: 'unladenWeight', icon: Weight },
    { label: 'Rated Power (KW)', field: 'ratedPowerKw', icon: Zap },
  ];

  return (
    <div className="bg-[#0d1117]/30 border border-[#30363d] rounded-[1.5rem] p-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {specs.map((spec, i) => (
          <div key={i} className={`p-4 bg-[#0d1117] border border-[#30363d] rounded-xl group hover:border-[#768390] transition-all ${spec.disabled ? 'opacity-30 grayscale' : ''}`}>
            <div className="flex items-center gap-2 mb-2 text-[#768390] group-hover:text-[#f0883e] transition-colors">
              <spec.icon size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{spec.label}</span>
            </div>
            <input
              type="text"
              value={formData.specs[spec.field]}
              onChange={e => updateSpec(spec.field, e.target.value)}
              disabled={spec.disabled}
              placeholder={spec.disabled ? 'N/A' : '...'}
              className="w-full bg-transparent border-none p-0 text-sm font-mono font-bold text-white focus:outline-none"
            />
          </div>
        ))}
        <SearchableDropdown
          label="Drive Type"
          options={['4WD', '2WD', 'AWD']}
          selected={formData.specs?.driveType}
          onSelect={(val) => updateSpec('driveType', val)}
        />
        <SearchableDropdown
          label="Transmission"
          options={state.data.transmissionTypes}
          selected={formData.specs?.transmissionType}
          onSelect={(val) => updateSpec('transmissionType', val)}
        />
        {isEV && (
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl group hover:border-[#768390] transition-all">
            <div className="flex items-center gap-2 mb-2 text-[#768390] group-hover:text-[#f0883e] transition-colors">
              <Zap size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Battery Capacity</span>
            </div>
            <input
              type="text"
              value={formData.specs.batteryCapacity}
              onChange={e => updateSpec('batteryCapacity', e.target.value)}
              className="w-full bg-transparent border-none p-0 text-sm font-mono font-bold text-white focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const AttachmentsTab = ({ formData, setFormData }) => {
  const addAttachment = () => {
    setFormData({
      ...formData,
      attachments: [...formData.attachments, { type: state.data.attachmentTypes[0], config: '', capacity: '', amount: 0, isStandard: false }]
    });
  };
  const updateAttachment = (idx, field, value) => {
    const newAttachments = [...formData.attachments];
    newAttachments[idx] = { ...newAttachments[idx], [field]: value };
    setFormData({ ...formData, attachments: newAttachments });
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-[#FFB800] uppercase tracking-tighter">Attachment Matrix</h3>
          <p className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-widest mt-1">Multi-Profile Accessory Configuration</p>
        </div>
        <button onClick={addAttachment} className="px-6 py-3 bg-[#FFB800] text-black font-black rounded-xl text-[0.625rem] uppercase tracking-widest hover:scale-105 transition-all cursor-pointer">ADD COMPONENT</button>
      </div>
      <div className="space-y-4">
        {formData.attachments.map((at, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-6 p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/10 relative group">
            <div className="space-y-1">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-widest ml-2">Type</label>
              <select
                value={at.type}
                onChange={e => updateAttachment(idx, 'type', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-[#f0883e] outline-none cursor-pointer"
              >
                {state.data.attachmentTypes.map(t => (
                  <option key={t} value={t} className="bg-[#161b22] text-white">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-widest ml-2">Configuration</label>
              <input
                type="text"
                value={at.config}
                onChange={e => updateAttachment(idx, 'config', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-widest ml-2">Capacity</label>
              <input
                type="text"
                value={at.capacity}
                onChange={e => updateAttachment(idx, 'capacity', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-widest ml-2">Amount (₹)</label>
              <input
                type="number"
                value={at.amount}
                onChange={e => updateAttachment(idx, 'amount', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
              />
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={at.isStandard}
                  onChange={e => updateAttachment(idx, 'isStandard', e.target.checked)}
                  className="w-5 h-5 rounded-lg accent-[#f0883e]"
                />
                <span className="text-[0.625rem] font-black text-slate-400 uppercase">STD</span>
              </label>
              <Trash2
                size={16}
                onClick={() => setFormData({ ...formData, attachments: formData.attachments.filter((_, i) => i !== idx) })}
                className="text-[#444c56] hover:text-[#f85149] cursor-pointer transition-colors"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const handleViewDocument = (doc) => {
  if (!doc || !doc.url) return;
  try {
    if (doc.url.startsWith('data:')) {
      const arr = doc.url.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      window.open(doc.url, '_blank');
    }
  } catch (err) {
    console.error('Failed to open document:', err);
    window.open(doc.url, '_blank');
  }
};

const DocUploadItem = ({ icon: Icon, label, fileName, status, onDelete, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between p-4 bg-[#0d1117]/30 border border-[#30363d] rounded-xl hover:border-primary/40 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-2.5 bg-bg-card rounded-xl border border-border-main shrink-0 group-hover:border-primary/30 transition-all text-primary">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-white truncate uppercase tracking-tight">{fileName}</p>
          <p className="text-[9px] text-text-dim font-mono font-bold uppercase tracking-widest mt-0.5">{label} • {status.toUpperCase()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onClick && (
          <ExternalLink size={14} className="text-[#444c56] group-hover:text-primary transition-colors shrink-0" />
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-text-dim hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const WarrantyTab = ({ formData, setFormData }) => {
  if (!formData || !formData.warranty) return null;
  const docInputRef = useRef(null);

  const updateWarranty = (field, value) => {
    setFormData({
      ...formData,
      warranty: { ...formData.warranty, [field]: parseInt(value) || 0 }
    });
  };

  const handleDocUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newDocs = [...(formData.documents || []), {
        name: file.name,
        url: reader.result,
        docType: file.type.split('/')[1] || 'pdf'
      }];
      setFormData({ ...formData, documents: newDocs });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <input
        type="file"
        ref={docInputRef}
        className="hidden"
        onChange={handleDocUpload}
      />

      {/* LEFT: WARRANTY STATS */}
      <div className="bg-[#0d1117]/30 border border-[#30363d] rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden h-[300px]">
        <div className="relative z-10">
          <h3 className="text-[11px] font-bold text-[#f0883e] tracking-[0.2em] uppercase mb-8 flex items-center gap-2">
            <ShieldCheck size={14} /> Coverage Parameters
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-bold text-[#768390] uppercase tracking-widest mb-2">Policy Term</p>
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  value={formData.warranty?.standardMonths}
                  onChange={e => updateWarranty('standardMonths', e.target.value)}
                  className="w-16 bg-transparent border-none p-0 text-4xl font-mono font-black text-white focus:outline-none"
                />
                <span className="text-sm font-normal text-[#444c56] mb-1">Months</span>
              </div>
            </div>
            <div className="border-l border-[#30363d] pl-8">
              <p className="text-[10px] font-bold text-[#768390] uppercase tracking-widest mb-2">Usage Cap</p>
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  value={formData.warranty?.standardHours}
                  onChange={e => updateWarranty('standardHours', e.target.value)}
                  className="w-24 bg-transparent border-none p-0 text-4xl font-mono font-black text-white focus:outline-none"
                />
                <span className="text-sm font-normal text-[#444c56] mb-1">Hours</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#30363d]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3fb950]/10 border border-[#3fb950]/30 rounded-lg flex items-center justify-center">
                <Check className="text-[#3fb950]" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">Active Coverage Verified</p>
                <p className="text-[10px] text-[#768390] font-mono">HASH: WD-{formData.model || 'NODE'}-X</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-8 -right-8 opacity-5">
          <ShieldCheck size={180} className="text-white" />
        </div>
      </div>

      {/* RIGHT: DOCUMENTATION NODE */}
      <div className="bg-[#0d1117]/30 border border-[#30363d] rounded-2xl p-6 flex flex-col h-[300px]">
        <h3 className="text-[11px] font-bold text-[#f0883e] tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
          <FileText size={14} /> Documentation Center
        </h3>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
          {(formData.documents || []).length > 0 ? formData.documents.map((doc, i) => (
            <DocUploadItem
              key={i}
              icon={doc.docType === 'pdf' ? BookOpen : FileCode}
              label={doc.docType?.toUpperCase() || 'DOC'}
              fileName={doc.name}
              status="uploaded"
              onClick={() => handleViewDocument(doc)}
              onDelete={() => setFormData({ ...formData, documents: formData.documents.filter((_, idx) => idx !== i) })}
            />
          )) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <UploadCloud size={48} className="mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-center">No documents uploaded for this asset</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[#30363d]">
          <button
            onClick={() => docInputRef.current?.click()}
            className="w-full py-3 bg-[#0d1117] border border-dashed border-[#444c56] rounded-xl flex items-center justify-center gap-3 text-xs font-bold text-[#768390] hover:border-[#768390] hover:text-[#adbac7] transition-all group"
          >
            <UploadCloud size={16} className="group-hover:text-[#58a6ff] transition-colors" /> INITIATE BATCH UPLOAD
          </button>
        </div>
      </div>
    </div>
  );
};

const MachineDetailModal = ({ isOpen, onClose, machine }) => {
  const [heroImage, setHeroImage] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('TECHNICAL PROFILE');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [leftPanelTab, setLeftPanelTab] = useState('SPECS');

  const { loans = [], user } = state.data;
  const isCustomer = user?.role === 'CUSTOMER' || (user?.role !== 'OEM' && user?.role !== 'Admin' && user?.role !== 'SUPERVISOR');
  const userCustId = (user?.customerId?._id || user?.customerId)?.toString();

  const machineLoan = loans.find(l => {
    const isMatch = l.machineName === machine?.name || l.machineId === machine?._id;
    if (!isMatch) return false;
    if (!isCustomer) return false;
    const loanCustId = (l.customerId?._id || l.customerId)?.toString();
    return loanCustId && userCustId && loanCustId === userCustId;
  });

  const technicalSpecs = [
    { label: 'Category', value: machine?.category || 'N/A' },
    { label: 'Power Source', value: machine?.specs?.fuelType || 'N/A' },
    { label: 'Horse Power', value: `${machine?.specs?.horsePower || 'N/A'} HP` },
    { label: 'Drive Type', value: machine?.specs?.driveType || 'N/A' },
    { label: 'Transmission', value: machine?.specs?.transmissionType || 'N/A' },
    { label: 'Battery Capacity', value: machine?.specs?.batteryCapacity || 'N/A' },
    { label: 'Engine Model', value: machine?.specs?.engineModel || 'N/A' },
    { label: 'Cylinders', value: machine?.specs?.cylinders || 'N/A' },
    { label: 'Mfg Year', value: machine?.specs?.year || 'N/A' },
    { label: 'Weight', value: machine?.specs?.unladenWeight ? `${machine.specs.unladenWeight} kg` : 'N/A' },
    { label: 'Warranty', value: machine?.warranty?.standardMonths ? `${machine.warranty.standardMonths}M / ${machine.warranty.standardHours}hr` : 'N/A' },
    { label: 'Serial No', value: machine?.serialNumber || machineLoan?.invoiceData?.serialNumber || machineLoan?.serialNumber || 'N/A' },
    { label: 'Chassis No', value: machine?.chassisNumber || machineLoan?.invoiceData?.chassisNumber || 'N/A' },
    { label: 'Invoice No', value: machine?.invoiceNumber || machineLoan?.invoiceData?.invoiceNumber || machineLoan?.invoiceNumber || 'N/A' },
    { label: 'Engine No', value: machine?.engineNumber || machineLoan?.invoiceData?.engineNumber || machine?.specs?.engineModel || 'N/A' },
    ...(machineLoan ? [
      { label: 'Dispatch Date', value: machineLoan.dispatchDate ? new Date(machineLoan.dispatchDate).toLocaleDateString() : 'N/A' }
    ] : [])
  ].filter(s => s.value !== 'N/A' && s.value !== 'N/A HP' && s.value !== ' HP');

  useEffect(() => {
    if (machine) {
      const images = Array.from(new Set([...(machine.images || []), machine.img].filter(Boolean)));
      setHeroImage(images[0] || '/logo.png');
    }
  }, [machine]);

  if (!machine) return null;

  const images = Array.from(new Set([...(machine.images || []), machine.img].filter(Boolean)));
  if (images.length === 0) images.push('/logo.png');

  return (
    <div className="h-[90vh] bg-bg-deep text-text-main flex flex-col overflow-hidden rounded-3xl border border-border-main shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <header className="h-20 px-8 border-b border-border-main flex items-center justify-between bg-bg-deep/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-2.5 bg-border-main/50 hover:bg-border-main rounded-xl text-text-dim hover:text-text-main transition-all cursor-pointer">
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-primary/10 text-primary border border-primary/30 uppercase tracking-widest">
                  {machine.category || 'ASSET'}
                </span>
                <span className="text-text-dim font-mono text-[9px] font-bold tracking-widest uppercase">ASSET-ID: {machine._id.toUpperCase()}</span>
                {machine.serialNumber && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border-main" />
                    <span className="text-primary/80 font-mono text-[9px] font-black tracking-widest uppercase">S/N: {machine.serialNumber}</span>
                  </>
                )}
              </div>
              <h1 className="text-xl font-black text-text-main tracking-tight uppercase">
                {machine.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-bg-card p-1.5 rounded-2xl border border-border-main shadow-inner">
            {['TECHNICAL PROFILE', 'FINANCIAL PROTOCOL']
              .filter(tab => tab !== 'FINANCIAL PROTOCOL' || user?.role !== 'OEM')
              .map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeDetailTab === tab ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-dim hover:text-text-main hover:bg-bg-active/10'}`}
                >
                  {tab}
                </button>
              ))}
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden bg-bg-deep">
          {activeDetailTab === 'TECHNICAL PROFILE' ? (
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-px bg-border-main overflow-hidden">
              {/* COLUMN 1: VISUAL & SPECS */}
              <div className="bg-bg-card p-6 flex flex-col gap-6 overflow-hidden">
                <div
                  className="relative group aspect-video bg-bg-deep border border-border-main rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-2xl cursor-zoom-in"
                  onClick={() => setFullScreenImage(heroImage)}
                >
                  <img src={heroImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setFullScreenImage(heroImage); }}
                    className="absolute bottom-4 right-4 p-2 bg-bg-card/90 backdrop-blur border border-border-main rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                  >
                    <Maximize2 size={16} className="text-text-main" />
                  </button>
                </div>

                <section className="flex-1 overflow-hidden flex flex-col">
                  {machineLoan?.invoiceData ? (
                    <div className="flex gap-2 mb-3 shrink-0 bg-bg-active/10 p-1 rounded-xl">
                      <button
                        onClick={() => setLeftPanelTab('SPECS')}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${leftPanelTab === 'SPECS' ? 'bg-primary text-black shadow-sm' : 'text-text-dim hover:text-text-main hover:bg-bg-active/20'}`}
                      >
                        <Cpu size={12} /> SPECS
                      </button>
                      <button
                        onClick={() => setLeftPanelTab('INVOICE')}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${leftPanelTab === 'INVOICE' ? 'bg-emerald-500 text-black shadow-sm' : 'text-text-dim hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                      >
                        <CheckCircle2 size={12} /> INVOICE
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-[11px] font-black text-primary mb-2.5 tracking-[0.3em] flex items-center gap-2 shrink-0">
                      <div className="p-1.5 bg-primary/10 rounded-lg"><Cpu size={12} /></div>
                      TECHNICAL INTELLIGENCE
                    </h3>
                  )}

                  <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {(leftPanelTab === 'SPECS' || !machineLoan?.invoiceData) && (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        {technicalSpecs.map((spec, i) => (
                          <div key={i} className="px-3 py-2 bg-bg-deep border border-border-main rounded-xl flex flex-col justify-center hover:border-primary/40 transition-all group">
                            <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.2em] mb-0.5 group-hover:text-primary/70 transition-colors">{spec.label}</span>
                            <span className="text-[11px] font-mono font-black text-text-main truncate" title={spec.value}>{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {leftPanelTab === 'INVOICE' && machineLoan?.invoiceData && (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                        {[
                          { label: 'Order ID', value: machineLoan.invoiceData.order_id },
                          { label: 'Delivery Note', value: machineLoan.invoiceData.deliveryNote },
                          { label: 'Vehicle No', value: machineLoan.invoiceData.vehicleNumber },
                          { label: 'Chassis No', value: machineLoan.invoiceData.chassisNumber },
                          { label: 'Serial No', value: machineLoan.invoiceData.serialNumber },
                          { label: 'Engine No', value: machineLoan.invoiceData.engineNumber },
                          { label: 'Invoice Date', value: machineLoan.invoiceData.invoiceDate ? new Date(machineLoan.invoiceData.invoiceDate).toLocaleDateString() : null }
                        ].filter(s => s.value).map((spec, i) => (
                          <div key={i} className={`px-3 py-2 bg-bg-deep border border-border-main rounded-xl flex flex-col justify-center hover:border-emerald-500/40 transition-all group ${spec.label === 'Invoice Date' ? 'col-span-2' : ''}`}>
                            <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.2em] mb-0.5 group-hover:text-emerald-500/70 transition-colors">{spec.label}</span>
                            <span className="text-[11px] font-mono font-black text-text-main truncate" title={spec.value}>{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* COLUMN 2: MODULES & RECORDS */}
              <div className="bg-bg-card p-6 flex flex-col gap-8 border-x border-border-main overflow-hidden">
                <section className="shrink-0 flex flex-col max-h-[45%]">
                  <h3 className="text-[11px] font-black text-blue-500 mb-4 tracking-[0.3em] flex items-center gap-3 shrink-0">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg"><Box size={14} /></div>
                    FUNCTIONAL MODULES
                  </h3>
                  <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {machine.attachments && machine.attachments.length > 0 ? machine.attachments.map((mod, i) => (
                      <div key={i} className={`p-4 border rounded-xl transition-all ${mod.isStandard ? 'bg-bg-deep border-blue-500/40 shadow-inner' : 'bg-bg-deep border-border-main'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black text-text-main font-mono uppercase italic tracking-tight">{mod.config || mod.type || mod.name || 'Attachment'}</p>
                            <p className="text-[9px] text-text-dim font-black tracking-widest uppercase mt-0.5">{mod.type || 'ATTACHMENT'}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-mono font-black ${mod.isStandard ? 'bg-blue-500/10 text-blue-500' : 'bg-border-main text-text-dim'}`}>
                            {mod.isStandard ? 'STD' : 'OPT'}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 border border-dashed border-border-main rounded-2xl text-center">
                        <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">No Active Modules Configured</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="flex-1 flex flex-col overflow-hidden">
                  <h3 className="text-[11px] font-black text-green-500 mb-4 tracking-[0.3em] flex items-center gap-3 shrink-0">
                    <div className="p-1.5 bg-green-500/10 rounded-lg"><FileText size={14} /></div>
                    ASSET RECORDS
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {machine.documents && machine.documents.length > 0 ? machine.documents.map((doc, i) => (
                      <div
                        key={i}
                        onClick={() => handleViewDocument(doc)}
                        className="group flex items-center justify-between p-4 bg-bg-deep border border-border-main rounded-xl hover:border-green-500/40 hover:bg-green-500/5 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-2.5 bg-bg-card rounded-xl border border-border-main shrink-0 group-hover:border-green-500/30 transition-all">
                            <FileText size={18} className="text-green-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate uppercase tracking-tight">{doc.name}</p>
                            <p className="text-[9px] text-[#444c56] font-mono font-bold uppercase tracking-widest">CERTIFICATE • SECURED ASSET</p>
                          </div>
                        </div>
                        <ExternalLink size={18} className="text-text-dim group-hover:text-green-500 shrink-0 transition-colors" />
                      </div>
                    )) : (
                      <div className="p-6 bg-bg-deep/40 border border-border-main border-dashed rounded-2xl text-center cursor-pointer hover:bg-border-main/50 transition-all">
                        <p className="text-[10px] text-text-dim font-black uppercase tracking-widest">Attach Technical Metadata</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* COLUMN 3: VALUATION & GALLERY */}
              <div className="bg-bg-card p-6 flex flex-col gap-8 overflow-hidden">
                <section className="shrink-0">
                  <h3 className="text-[11px] font-black text-primary mb-4 tracking-[0.3em] flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><DollarSign size={14} /></div>
                    VALUATION
                  </h3>
                  <div className="p-6 bg-gradient-to-br from-bg-card to-bg-deep border border-border-main rounded-2xl shadow-2xl relative overflow-hidden group mb-4 flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] mb-1.5">Asset Appraisal</p>
                      <p className="text-4xl font-mono font-black text-primary tracking-tighter italic">₹{((machine.pricing?.totalPrice || 0) / 100000).toFixed(2)}L</p>
                    </div>
                    <DollarSign size={80} className="absolute -bottom-4 -right-4 text-border-main/20 group-hover:text-primary/5 transition-all" />
                  </div>

                  {machine.pricing?.oemNetSaleValue > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                      <div className="p-3 bg-bg-deep border border-border-main rounded-xl">
                        <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">OEM NSV</p>
                        <p className="text-sm font-mono font-black text-white">₹{((machine.pricing?.oemNetSaleValue || 0) / 100000).toFixed(2)}L</p>
                      </div>
                      <div className="p-3 bg-bg-deep border border-border-main rounded-xl">
                        <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Service Comm.</p>
                        <p className="text-sm font-mono font-black text-white">₹{machine.pricing?.serviceCommission?.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-bg-deep border border-border-main rounded-xl">
                        <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Sale Comm. A</p>
                        <p className="text-sm font-mono font-black text-white">₹{machine.pricing?.commissionA?.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-bg-deep border border-border-main rounded-xl">
                        <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Sale Comm. B</p>
                        <p className="text-sm font-mono font-black text-white">₹{machine.pricing?.commissionB?.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="flex-1 flex flex-col overflow-hidden">
                  <h3 className="text-[11px] font-black text-text-main mb-4 tracking-[0.3em] flex items-center gap-3 shrink-0">
                    <div className="p-1.5 bg-bg-active/10 rounded-lg"><Maximize2 size={14} /></div>
                    GALLERY EXPLORER
                  </h3>
                  <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => { setHeroImage(img); setFullScreenImage(img); }}
                        className={`aspect-video bg-bg-deep border-2 rounded-2xl overflow-hidden cursor-zoom-in transition-all group ${heroImage === img ? 'border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'border-border-main hover:border-text-dim'}`}
                      >
                        <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#0d1117] flex flex-col overflow-y-auto custom-scrollbar">
              {machineLoan ? (
                machineLoan.schedule && machineLoan.schedule.length > 0 && machineLoan.emi != null ? (
                <div className="flex-1 flex flex-col p-6 space-y-6">
                  {/* FINANCIAL METRICS */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 shrink-0">
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
                      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest mb-1.5 flex justify-between">NEXT EMI <CreditCard size={14} className="text-[#f0883e]" /></p>
                      <p className="text-xl font-black italic tracking-tighter text-[#f0883e]">₹{(machineLoan.emi || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
                      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest mb-1.5 flex justify-between">TOTAL PAID <TrendingUp size={14} className="text-[#3fb950]" /></p>
                      <p className="text-xl font-black italic tracking-tighter text-[#3fb950]">₹{((machineLoan.schedule.filter(s => s.status === 'Paid').length) * (machineLoan.emi || 0)).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
                      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest mb-1.5 flex justify-between">OUTSTANDING BAL <AlertCircle size={14} className="text-white" /></p>
                      <p className="text-xl font-black italic tracking-tighter text-white">₹{((machineLoan.schedule.find(s => s.status === 'Pending') || machineLoan.schedule[machineLoan.schedule.length - 1])?.balance || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
                      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest mb-1.5 flex justify-between">OVERDUE INTEREST <History size={14} className="text-rose-500" /></p>
                      <p className="text-xl font-black italic tracking-tighter text-rose-500">₹0</p>
                    </div>
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
                      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest mb-1.5 flex justify-between">LAST PAYMENT <Calendar size={14} className="text-[#768390]" /></p>
                      <p className="text-xl font-black italic tracking-tighter text-[#768390]">{machineLoan.schedule.filter(s => s.status === 'Paid').pop()?.dueDate || '--'}</p>
                    </div>
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
                      <p className="text-[9px] font-bold text-[#768390] uppercase tracking-widest mb-1.5 flex justify-between">NEXT PAYMENT <Clock size={14} className="text-[#58a6ff]" /></p>
                      <p className="text-xl font-black italic tracking-tighter text-[#58a6ff]">{machineLoan.schedule.find(s => s.status === 'Pending')?.dueDate || 'DONE'}</p>
                    </div>
                  </div>

                  {/* SCHEDULE & OVERDUE TABS */}
                  <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 shrink-0 gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">Repayment Schedule</h3>
                          <p className="text-[9px] text-[#768390] font-bold uppercase tracking-widest mt-0.5">Financing Schedule Details</p>
                        </div>
                        <div className="hidden sm:block h-8 w-px bg-[#30363d]" />
                        <div className="flex p-1 bg-[#0d1117] border border-[#30363d] rounded-xl">
                          <button
                            onClick={() => setShowAdvanced(false)}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${!showAdvanced ? 'bg-[#30363d] text-[#f0883e]' : 'text-[#444c56] hover:text-[#768390]'}`}
                          >
                            Schedule
                          </button>
                          <button
                            onClick={() => setShowAdvanced(true)}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${showAdvanced ? 'bg-[#30363d] text-rose-500' : 'text-[#444c56] hover:text-[#768390]'}`}
                          >
                            Overdue Interest
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[8px] font-black text-[#768390] uppercase block">Progress</span>
                          <span className="text-sm font-black text-[#f0883e] font-mono italic">{Math.round((machineLoan.schedule.filter(s => s.status === 'Paid').length / (machineLoan.schedule.length || 1)) * 100)}%</span>
                        </div>
                        <div className="w-24 h-1.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                          <div className="h-full bg-[#f0883e] shadow-[0_0_10px_rgba(240,136,62,0.5)]" style={{ width: `${(machineLoan.schedule.filter(s => s.status === 'Paid').length / (machineLoan.schedule.length || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden flex flex-col">
                      <div className="overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
                        {!showAdvanced ? (
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#1c2128] z-10 border-b border-[#30363d]">
                              <tr className="text-[9px] font-bold text-[#768390] uppercase tracking-widest">
                                <th className="px-5 py-3 font-mono">#ID</th>
                                <th className="px-5 py-3">Due Date</th>
                                <th className="px-5 py-3 text-right">Principal</th>
                                <th className="px-5 py-3 text-right">Interest</th>
                                <th className="px-5 py-3 text-right">Balance</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-center">Received Date</th>
                                <th className="px-5 py-3 text-right text-red-500">Overdue</th>
                                <th className="px-5 py-3 text-right">Delay Int.</th>
                                <th className="px-5 py-3 text-center">Receipt</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]/50">
                              {machineLoan.schedule.map(s => (
                                <tr key={s.installment} className="hover:bg-[#f0883e]/5 transition-colors group">
                                  <td className="px-5 py-2.5 text-[10px] font-mono font-bold text-[#444c56] group-hover:text-[#f0883e] transition-colors">{(s.installment || '').toString().padStart(2, '0')}</td>
                                  <td className="px-5 py-2.5 text-[10px] font-bold text-white uppercase italic">{s.dueDate}</td>
                                  <td className="px-5 py-2.5 text-[10px] font-mono text-[#768390] text-right">₹{(s.principal || 0).toLocaleString()}</td>
                                  <td className="px-5 py-2.5 text-[10px] font-mono text-rose-400/70 text-right">₹{(s.interest || 0).toLocaleString()}</td>
                                  <td className="px-5 py-2.5 text-[10px] font-mono font-bold text-white text-right italic">₹{(s.balance || 0).toLocaleString()}</td>
                                  <td className="px-5 py-2.5 text-center">
                                    <div className="flex items-center justify-center">
                                      {s.status === 'Paid' ? (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3fb950]/10 text-[#3fb950] rounded border border-[#3fb950]/20 text-[8px] font-bold uppercase tracking-tighter">
                                          <CheckCircle2 size={10} /> CLEAR
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f0883e]/10 text-[#f0883e] rounded border border-[#f0883e]/20 text-[8px] font-bold uppercase tracking-tighter">
                                          <History size={10} /> PENDING
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-2.5 text-center text-[10px] font-mono text-[#768390]">
                                    {s.status === 'Paid' ? s.dueDate : '--'}
                                  </td>
                                  <td className="px-5 py-2.5 text-right text-[10px] font-mono text-red-500 font-bold">
                                    {s.status === 'Pending' && new Date(s.dueDate) < new Date() ? `₹${(machineLoan.emi || 0).toLocaleString()}` : '—'}
                                  </td>
                                  <td className="px-5 py-2.5 text-right text-[10px] font-mono text-rose-500">
                                    {s.status === 'Paid' ? '--' : '--'}
                                  </td>
                                  <td className="px-5 py-2.5 text-center">
                                    {s.status === 'Paid' ? (
                                      <button
                                        className="p-1.5 hover:bg-[#f0883e]/20 rounded-md text-[#f0883e] transition-all"
                                        title="Download Receipt"
                                      >
                                        <Download size={14} />
                                      </button>
                                    ) : (
                                      <span className="text-[#444c56] opacity-30 cursor-not-allowed">
                                        <Download size={14} />
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-8 text-center">
                            <History size={48} className="mx-auto text-rose-500/20 mb-4" />
                            <h3 className="text-sm font-black text-white uppercase italic mb-2">Overdue Interest</h3>
                            <p className="text-[10px] text-[#768390] font-bold uppercase tracking-widest max-w-xs mx-auto mb-6">Penalty calculation based on standard contract grace period and delay dates.</p>
                            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                              <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                                <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Grace Period</p>
                                <p className="text-lg font-black text-white italic">05 DAYS</p>
                              </div>
                              <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                                <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Penalty Rate</p>
                                <p className="text-lg font-black text-rose-500 italic">2.0% PM</p>
                              </div>
                              <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl">
                                <p className="text-[8px] font-bold text-[#768390] uppercase mb-1">Total Accrued</p>
                                <p className="text-lg font-black text-[#f0883e] italic">₹0</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-40 opacity-70">
                    <div className="w-16 h-16 border-2 border-[#f0883e] border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(240,136,62,0.5)]"></div>
                    <h3 className="text-xl font-black text-[#f0883e] uppercase tracking-widest mb-2">Finance Protocol Pending</h3>
                    <p className="text-[10px] text-text-dim font-mono uppercase text-center max-w-md leading-relaxed">
                      The financing schedule and EMI structures for this asset are currently being processed.<br/>
                      Please check back later once the settlement data is fully generated.
                    </p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-40 opacity-30">
                  <History size={64} className="mb-6" />
                  <h3 className="text-xl font-black text-text-main uppercase tracking-widest mb-2">No Finance Protocol Found</h3>
                  <p className="text-xs text-text-dim font-mono uppercase">This asset is currently in non-financed status</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <footer className="h-10 px-8 border-t border-border-main flex items-center justify-between bg-bg-deep/80 backdrop-blur-xl text-[9px] font-mono text-text-dim uppercase tracking-widest shrink-0">
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> PROTOCOL: PRO-X24</span>
            <span className="flex items-center gap-2 text-text-dim">LAST SYNC: {new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shadow-[0_0_10px_rgba(63,185,80,0.5)]" /> STATUS: OPERATIONAL</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shadow-[0_0_10px_rgba(63,185,80,0.5)]" /> STATUS: OPERATIONAL</span>
            <span className="text-[#adbac7] font-bold">{new Date().toLocaleTimeString()}</span>
          </div>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--primary); }
      `}} />

      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 z-10"
          >
            <X size={24} />
          </button>
          <img
            src={fullScreenImage}
            className="max-w-full max-h-[90vh] object-contain cursor-zoom-out animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg"
            alt="Fullscreen View"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default MachineManagement;
