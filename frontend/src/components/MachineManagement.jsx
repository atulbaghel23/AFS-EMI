import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import { showNotification, confirmAction, hasPermission } from '../utils';
import Modal from './Modal.jsx';
import {
  X, Download, Cpu, Zap, Settings, FileText, Maximize2,
  Info, Calendar, Weight, History, Box, Truck, DollarSign, ShieldCheck, ExternalLink,
  HardHat, Eye, Edit3, Trash2, Plus, Search, ChevronDown, UploadCloud, FileCode, BookOpen,
  Paperclip, Check, Settings2, Hash, LayoutGrid, List, RefreshCw, CheckCircle2,
  ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

const MachineManagement = () => {
  const { machines = [], machineListView, user, systemConfig } = state.data;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [detailMachine, setDetailMachine] = useState(null);

  const isAdmin = user?.role === 'OEM' || user?.role === 'Admin';
  const [localColConfig, setLocalColConfig] = useState({ identity: true, status: true, specs: true, valuation: true, dataSync: true, control: true });
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

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const globalConfig = systemConfig?.machineColumns || localColConfig;

  const toggleColumn = (key) => {
    if (!isAdmin) return showNotification('Access Denied: Only Admin can modify global view protocols', 'error');
    const newConfig = { ...localColConfig, [key]: !localColConfig[key] };
    setLocalColConfig(newConfig);
    state.updateConfig({ machineColumns: newConfig });
  };

  useEffect(() => {
    if (globalConfig) {
      setLocalColConfig(globalConfig);
    }
  }, [globalConfig]);

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

  const filteredMachines = machines.filter(m =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
  const paginatedData = filteredMachines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
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
                      <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">Global View Protocols</h4>
                      {!isAdmin && <span className="text-[7px] font-bold text-red-500 uppercase flex items-center gap-1"><ShieldCheck size={10} /> Read Only</span>}
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
                  </div>
                )}
              </div>
            )}

            {hasPermission(user, 'machines', 'create') && (
              <button onClick={handleAddMachine} className="px-8 py-3 bg-[#f0883e] text-black text-xs font-black rounded-xl hover:bg-[#f0883e]/90 transition-all shadow-[0_0_20px_rgba(240,136,62,0.15)] active:scale-95 uppercase tracking-widest flex items-center gap-2">
                <Plus size={16} /> AUTHORIZE ASSET
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-bg-card/50 border border-border-main rounded-2xl">
          <div className="relative flex-1">
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
        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredMachines.map(m => (
              <MachineCard
                key={m._id}
                machine={m}
                user={user}
                onEdit={() => handleEditMachine(m)}
                onDelete={() => handleDeleteMachine(m._id)}
                onView={() => setDetailMachine(m)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card !p-0 flex-1 overflow-hidden shadow-2xl border border-border-main bg-bg-card/80 flex flex-col min-h-0 mt-2">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max relative">
              <thead className="sticky top-0 z-[40]">
                <tr className="bg-bg-card border-b border-border-main shadow-sm">
                  {localColConfig.identity && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Asset Identity</th>}
                  {localColConfig.specs && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Specifications</th>}
                  {localColConfig.valuation && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Valuation</th>}
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
                  <tr key={m._id} className="hover:bg-bg-active transition-all group cursor-pointer" onClick={() => setDetailMachine(m)}>
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
                          </div>
                        </div>
                      </td>
                    )}

                    {localColConfig.specs && (
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-text-dim uppercase">
                            <Zap size={10} className="text-[#f0883e]" />
                            {m.machineType}
                          </div>
                          <div className="text-[9px] font-bold text-text-dim uppercase tracking-wider">{m.specs?.fuelType || 'Diesel'} UNIT</div>
                        </div>
                      </td>
                    )}
                    {localColConfig.valuation && (
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-text-main text-[10px]">₹{((m.pricing?.totalPrice || 0) / 100000).toFixed(2)}L</div>
                        <div className="text-[8px] font-bold text-text-dim uppercase tracking-tighter italic">NSV: ₹{((m.pricing?.oemNetSaleValue || 0) / 100000).toFixed(1)}L</div>
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
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

          <div className="bg-bg-card border-t border-border-main p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">
                Showing <span className="text-text-main">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredMachines.length)}</span> of <span className="text-[#f0883e]">{filteredMachines.length}</span> Assets
              </p>
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
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-[#f0883e] text-black shadow-lg shadow-orange-500/20' : 'bg-bg-deep border border-border-main text-text-dim hover:text-text-main'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#768390] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <MachineFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machine={editingMachine}
      />
    </div>
  );
}; const MachineCard = ({ machine, onEdit, onDelete, onView, user }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = [...(machine.images || []), machine.img].filter(Boolean);
  if (images.length === 0) images.push('https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=1200');

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImgIndex(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="group bg-bg-card border border-border-main rounded-xl overflow-hidden flex flex-col h-full hover:border-[#f0883e]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/5">
      <div className="relative h-40 overflow-hidden bg-black cursor-pointer" onClick={onView}>
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
            <h3 className="text-sm font-black text-text-main truncate group-hover:text-[#f0883e] transition-colors">{machine.name || 'Undefined Asset'}</h3>
            <span className="text-[10px] font-mono font-bold text-[#f0883e] italic">₹{((machine.pricing?.totalPrice || 0) / 100000).toFixed(1)}L</span>
          </div>
          <p className="text-[10px] text-text-dim font-bold uppercase tracking-[0.1em]">{machine.model || 'N/A MODEL'}</p>
          {machine.serialNumber && (
            <div className="mt-2 py-1 px-2 bg-bg-deep border border-border-main rounded-md inline-block">
              <p className="text-[8px] font-mono font-bold text-text-dim uppercase tracking-tighter">
                S/N: <span className="text-text-main/60 group-hover:text-[#f0883e] transition-colors">{machine.serialNumber}</span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border-main flex items-center justify-between">
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
                    <img src={m.img || (m.images && m.images[0]) || 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=300'} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
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
          <input
            className="w-full bg-transparent px-4 py-2 border-b border-[#30363d] text-sm text-white focus:outline-none"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredOptions.map((opt) => (
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
        category: state.data.categories[0] || '',
        name: '', model: '',
        machineType: state.data.dieselTypes[0] || '',
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
      <nav className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-[#30363d] mb-4">
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

      <div className="overflow-visible">
        {activeTab === 'BASIC INFO' && <BasicTab formData={formData} setFormData={setFormData} fileInputRef={fileInputRef} />}
        {activeTab === 'PRICING' && <PricingTab formData={formData} setFormData={setFormData} />}
        {activeTab === 'SPECIFICATIONS' && <SpecsTab formData={formData} setFormData={setFormData} />}
        {activeTab === 'ATTACHMENTS' && <AttachmentsTab formData={formData} setFormData={setFormData} />}
        {activeTab === 'WARRANTY' && <WarrantyTab formData={formData} setFormData={setFormData} />}
      </div>

      <footer className="mt-4 pt-6 border-t border-[#30363d] flex items-center justify-between">
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

  const { loans = [], user } = state.data;
  const machineLoan = loans.find(l => l.machineId === machine?._id);

  const technicalSpecs = [
    { label: 'Category', value: machine?.category || 'N/A' },
    { label: 'Power Source', value: machine?.specs?.fuelType || 'N/A' },
    { label: 'Horse Power', value: `${machine?.specs?.horsePower || 'N/A'} HP` },
    { label: 'Drive Type', value: machine?.specs?.driveType || 'N/A' },
    { label: 'Transmission', value: machine?.specs?.transmissionType || 'N/A' },
    { label: 'Battery Capacity', value: machine?.specs?.batteryCapacity || 'N/A' },
  ].filter(s => s.value !== 'N/A' && s.value !== 'N/A HP');

  useEffect(() => {
    if (machine) {
      const images = [...(machine.images || []), machine.img].filter(Boolean);
      setHeroImage(images[0] || 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=1200');
    }
  }, [machine]);

  if (!machine) return null;

  const images = [...(machine.images || []), machine.img].filter(Boolean);
  if (images.length === 0) images.push('https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&q=80&w=1200');

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
                <div className="relative group aspect-video bg-bg-deep border border-border-main rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-2xl">
                  <img src={heroImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button className="absolute bottom-4 right-4 p-2 bg-bg-card/90 backdrop-blur border border-border-main rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                    <Maximize2 size={16} className="text-text-main" />
                  </button>
                </div>

                <section className="flex-1 overflow-hidden flex flex-col">
                  <h3 className="text-[11px] font-black text-primary mb-4 tracking-[0.3em] flex items-center gap-3 shrink-0">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><Cpu size={14} /></div>
                    TECHNICAL INTELLIGENCE
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-3">
                      {technicalSpecs.map((spec, i) => (
                        <div key={i} className="p-4 bg-bg-deep border border-border-main rounded-xl flex flex-col justify-center hover:border-primary/40 transition-all group">
                          <span className="text-[8px] font-black text-text-dim uppercase tracking-[0.2em] mb-1 group-hover:text-primary/70 transition-colors">{spec.label}</span>
                          <span className="text-[12px] font-mono font-black text-text-main truncate">{spec.value}</span>
                        </div>
                      ))}
                    </div>
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
                            <p className="text-xs font-black text-text-main font-mono uppercase italic tracking-tight">{mod.config || mod.type}</p>
                            <p className="text-[9px] text-text-dim font-black tracking-widest uppercase mt-0.5">{mod.type}</p>
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
                  <div className="p-6 bg-gradient-to-br from-bg-card to-bg-deep border border-border-main rounded-2xl shadow-2xl relative overflow-hidden group h-32 flex items-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] mb-1.5">Asset Appraisal</p>
                      <p className="text-4xl font-mono font-black text-primary tracking-tighter italic">₹{((machine.pricing?.totalPrice || 0) / 100000).toFixed(1)}L</p>
                    </div>
                    <DollarSign size={80} className="absolute -bottom-4 -right-4 text-border-main/20 group-hover:text-primary/5 transition-all" />
                  </div>
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
                        onClick={() => setHeroImage(img)}
                        className={`aspect-video bg-bg-deep border-2 rounded-2xl overflow-hidden cursor-pointer transition-all group ${heroImage === img ? 'border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'border-border-main hover:border-text-dim'}`}
                      >
                        <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="h-full p-8 overflow-y-auto custom-scrollbar">
              {machineLoan ? (
                <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-bg-card border border-border-main rounded-2xl p-6 flex flex-col justify-between h-36">
                      <p className="text-[11px] font-black text-text-dim uppercase tracking-widest">Total Principal</p>
                      <p className="text-3xl font-mono font-black text-text-main">₹{(machineLoan.principal / 100000).toFixed(1)}L</p>
                    </div>
                    <div className="bg-bg-card border border-border-main rounded-2xl p-6 flex flex-col justify-between h-36">
                      <p className="text-[11px] font-black text-primary uppercase tracking-widest">Monthly EMI</p>
                      <p className="text-3xl font-mono font-black text-primary">₹{(machineLoan.emi / 1000).toFixed(1)}k</p>
                    </div>
                    <div className="bg-bg-card border border-border-main rounded-2xl p-6 flex flex-col justify-between h-36">
                      <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Tenure</p>
                      <p className="text-3xl font-mono font-black text-blue-500">{machineLoan.tenure} <span className="text-xs uppercase">Years</span></p>
                    </div>
                    <div className="bg-bg-card border border-border-main rounded-2xl p-6 flex flex-col justify-between h-36">
                      <p className="text-[11px] font-black text-green-500 uppercase tracking-widest">Paid Ratio</p>
                      <p className="text-3xl font-mono font-black text-green-500">
                        {Math.round((machineLoan.schedule.filter(s => s.status === 'Paid').length / machineLoan.schedule.length) * 100)}%
                      </p>
                    </div>
                    <div className="bg-bg-card border border-border-main rounded-3xl overflow-hidden shadow-2xl col-span-full">
                      <div className="px-8 py-5 border-b border-border-main bg-bg-deep/50 flex items-center justify-between">
                        <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em]">Repayment Schedule</h3>
                        <span className="text-[10px] font-mono text-text-dim uppercase">Authorized Plan Protocol</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-bg-card border-b border-border-main">
                              <th className="px-8 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest">Instalment</th>
                              <th className="px-8 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest">Due Date</th>
                              <th className="px-8 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest">EMI Payload</th>
                              <th className="px-8 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest">Status</th>
                              <th className="px-8 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest text-right">Verification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-main/50">
                            {machineLoan.schedule.slice(0, 12).map((inst, i) => (
                              <tr key={i} className="hover:bg-bg-active/30 transition-colors">
                                <td className="px-8 py-4 font-mono text-xs text-text-dim">{inst.installment.toString().padStart(2, '0')}</td>
                                <td className="px-8 py-4 font-mono text-xs text-text-main uppercase">{inst.dueDate}</td>
                                <td className="px-8 py-4 font-mono text-xs text-primary font-bold">₹{inst.emi.toLocaleString()}</td>
                                <td className="px-8 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${inst.status === 'Paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-text-dim/10 text-text-dim border border-text-dim/20'}`}>
                                    {inst.status}
                                  </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                  <ShieldCheck size={14} className={inst.status === 'Paid' ? 'text-green-500 ml-auto' : 'text-border-main ml-auto'} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {machineLoan.schedule.length > 12 && (
                        <div className="p-4 bg-bg-deep/30 text-center border-t border-border-main">
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">Additional cycles truncated for performance</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
    </div>
  );
};

export default MachineManagement;
