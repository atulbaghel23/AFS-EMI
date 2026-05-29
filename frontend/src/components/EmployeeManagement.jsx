import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import { showNotification, confirmAction, hasPermission } from '../utils';
import Modal from './Modal.jsx';
import {
  X, Search, Edit3, Trash2, UserPlus, ShieldCheck, Mail, Phone,
  Fingerprint, ShieldAlert, AlertCircle, RefreshCw, Loader2, CheckCircle2,
  Filter, MoreHorizontal, UserCheck, LayoutGrid, List, Settings2,
  Hash, ChevronDown, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import Captcha from './Captcha';

const EmployeeManagement = () => {
  const { employees, roles, user, employeeColumns: globalConfig } = state.data;
  const roleName = (user?.roleId?.name || user?.role || '').toUpperCase();
  const isAdmin = roleName.includes('ADMIN') || roleName.includes('SUPER');

  const defaultConfig = {
    name: true, customId: true, phone: true, email: true, role: true, status: true, control: true
  };

  const [localColConfig, setLocalColConfig] = useState(globalConfig || defaultConfig);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [error, setError] = useState(null);

  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const [validationErrors, setValidationErrors] = useState({ email: '', phone: '' });

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', roleId: '', customId: '', password: ''
  });

  const toggleColumn = (key) => {
    if (!isAdmin) return showNotification('Access Denied: Only Admin can modify global view protocols', 'error');
    const newConfig = { ...localColConfig, [key]: !localColConfig[key] };
    setLocalColConfig(newConfig);
    state.updateConfig({ employeeColumns: newConfig });
  };

  useEffect(() => {
    if (globalConfig) {
      setLocalColConfig(globalConfig);
    }
  }, [globalConfig]);

  const checkDuplicate = (field, value) => {
    if (!value) return;
    const exists = state.data.employees.some(emp =>
      emp._id !== (editingEmployee?._id) && emp[field] === value
    );
    if (exists) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: `Security Alert: This ${field === 'phone' ? 'Mobile Number' : 'Email'} is already authorized.`
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const filteredEmployees = (employees || []).filter(emp => {
    if (!emp) return false;
    const name = (emp.name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const customId = (emp.customId || '').toLowerCase();
    const s = searchTerm.toLowerCase();
    return name.includes(s) || email.includes(s) || customId.includes(s);
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedData = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        roleId: employee.roleId?._id || employee.roleId,
        customId: employee.customId || '',
        password: ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', email: '', phone: '', roleId: '', customId: '', password: '' });
    }
    setError(null);
    setValidationErrors({ email: '', phone: '' });
    setIsCaptchaVerified(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation Protocols
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('Invalid Email Structure', 'error');
      emailRef.current?.focus();
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      showNotification('Mobile must be exactly 10 digits', 'error');
      phoneRef.current?.focus();
      return;
    }

    if (validationErrors.email || validationErrors.phone) {
      showNotification('Security Breach: Duplicate data detected', 'error');
      return;
    }

    if (state.data.security?.captcha?.authorizePersonnel && !isCaptchaVerified && !editingEmployee) {
      return showNotification('Captcha Verification Required', 'error');
    }

    setError(null);
    try {
      if (editingEmployee) {
        await state.updateEmployee(editingEmployee._id, formData);
        showNotification('Personnel Profile Updated', 'success');
      } else {
        await state.addEmployee(formData);
        showNotification('New Personnel Authorized', 'success');
      }
      handleCloseModal();
    } catch (err) {
      const msg = err.message || 'Authorization Protocol Failure';
      setError(msg);
      showNotification(msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (await confirmAction('Revoke Access?', 'This will permanently terminate this employee\'s system access protocols.')) {
      await state.deleteEmployee(id);
      showNotification('Personnel Access Revoked', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col gap-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-text-main tracking-tighter uppercase italic flex items-center gap-3">
              <ShieldCheck className="text-[#f0883e]" size={32} /> Personnel Directory
            </h2>
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Fingerprint size={12} className="text-[#3fb950]" /> Active Security Node & Authorization Terminal
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div ref={colConfigRef} className="relative">
              <button
                onClick={() => setShowColConfig(!showColConfig)}
                className={`p-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showColConfig ? 'bg-[#f0883e]/10 border-[#f0883e]/50 text-[#f0883e]' : 'bg-bg-card border border-border-main text-text-dim hover:text-text-main'
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
                      { id: 'name', label: 'Employee Name', icon: <UserCheck size={10} /> },
                      { id: 'customId', label: 'Personnel ID', icon: <Hash size={10} /> },
                      { id: 'phone', label: 'Contact Phone', icon: <Phone size={10} /> },
                      { id: 'email', label: 'Email Protocol', icon: <Mail size={10} /> },
                      { id: 'role', label: 'Access Level', icon: <ShieldCheck size={10} /> },
                      { id: 'status', label: 'Auth Status', icon: <CheckCircle2 size={10} /> },
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
                </div>
              )}
            </div>

            {hasPermission(user, 'employees', 'create') && (
              <button
                onClick={() => handleOpenModal()}
                className="px-8 py-3 bg-[#f0883e] text-black text-xs font-black rounded-xl hover:bg-[#f0883e]/90 transition-all shadow-[0_0_20px_rgba(240,136,62,0.15)] active:scale-95 uppercase tracking-widest flex items-center gap-2"
              >
                <UserPlus size={16} /> AUTHORIZE PERSONNEL
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-bg-card/50 border border-border-main rounded-2xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444c56]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Name, ID, or Email protocol..."
              className="w-full pl-10 pr-4 py-3 bg-bg-deep border border-border-main rounded-xl text-xs text-text-main font-bold focus:border-[#f0883e] outline-none transition-all placeholder:text-text-dim"
            />
          </div>
        </div>
      </div>

      <div className="glass-card !p-0 flex-1 overflow-hidden shadow-2xl border border-border-main bg-bg-card/80 flex flex-col min-h-0 mt-2">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max relative">
            <thead className="sticky top-0 z-[40]">
              <tr className="bg-bg-card border-b border-border-main shadow-sm">
                {localColConfig.name && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Personnel Node</th>}
                {localColConfig.customId && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">ID Node</th>}
                {localColConfig.phone && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Contact</th>}
                {localColConfig.email && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Email</th>}
                {localColConfig.role && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Clearance</th>}
                {localColConfig.status && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-bg-card">Status</th>}
                {localColConfig.control && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-dim text-right sticky right-0 bg-bg-card z-[41]">Ops</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-bold text-[#444c56] uppercase tracking-[0.3em]">No personnel matching your query in the security cluster</p>
                  </td>
                </tr>
              ) : paginatedData.map(emp => (
                <tr key={emp._id} className="hover:bg-bg-active transition-all group">
                  {localColConfig.name && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f0883e] to-[#ffab70] flex items-center justify-center text-black font-black text-[10px] shadow-lg">
                          {emp.name[0]}
                        </div>
                        <span className="font-black text-text-main text-[11px] tracking-tight group-hover:text-[#f0883e] transition-colors">{emp.name}</span>
                      </div>
                    </td>
                  )}
                  {localColConfig.customId && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim uppercase">{emp.customId || 'N/A'}</td>}
                  {localColConfig.phone && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim">{emp.phone || 'N/A'}</td>}
                  {localColConfig.email && <td className="px-6 py-4 text-[10px] font-mono font-bold text-text-dim">{emp.email}</td>}
                  {localColConfig.role && (
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-[#f0883e]/10 text-[#f0883e] text-[9px] font-black rounded uppercase tracking-wider">
                        {emp.roleId?.name || 'Standard'}
                      </span>
                    </td>
                  )}
                  {localColConfig.status && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#3fb950] shadow-[0_0_8_#3fb950]" />
                        <span className="text-[9px] font-black text-[#3fb950] uppercase tracking-widest italic">Authorized</span>
                      </div>
                    </td>
                  )}
                  {localColConfig.control && (
                    <td className="px-6 py-4 text-right sticky right-0 bg-bg-card/95 backdrop-blur-md">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenModal(emp)} className="p-1.5 text-text-dim hover:text-[#f0883e] transition-all"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(emp._id)} className="p-1.5 text-text-dim hover:text-red-500 transition-all"><Trash2 size={14} /></button>
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
              Showing <span className="text-text-main">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span> of <span className="text-[#f0883e]">{filteredEmployees.length}</span> Personnel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 bg-bg-deep border border-border-main text-text-dim hover:text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
              className="p-2 bg-bg-deep border border-border-main text-text-dim hover:text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEmployee ? 'Update Authorization' : 'New Personnel Authorization'}
        subtitle="Security Clearance Protocol"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-[#768390] uppercase tracking-widest">Personnel Name</p>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-[#f0883e] outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-[#768390] uppercase tracking-widest">Personnel ID</p>
                {state.data.numbering?.employee?.mode === 'Auto' && !editingEmployee && <span className="text-[8px] font-mono text-[#f0883e]">AUTO-GEN</span>}
              </div>
              <input
                type="text"
                value={formData.customId}
                onChange={(e) => handleInputChange('customId', e.target.value)}
                disabled={state.data.numbering?.employee?.mode === 'Auto' && !editingEmployee}
                className={`w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs font-mono font-bold focus:border-[#f0883e] outline-none transition-all ${state.data.numbering?.employee?.mode === 'Auto' && !editingEmployee ? 'opacity-50 cursor-not-allowed' : 'text-white'}`}
                placeholder={state.data.numbering?.employee?.mode === 'Auto' && !editingEmployee ? 'SYSTEM-GEN' : 'EMP-001'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-[#768390] uppercase tracking-widest">Email Protocol</p>
              <input
                ref={emailRef}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={(e) => checkDuplicate('email', e.target.value)}
                className={`w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-xs text-white font-mono outline-none transition-all ${validationErrors.email ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-[#30363d] focus:border-[#f0883e]'}`}
                required
              />
              {validationErrors.email && <p className="text-[8px] font-bold text-red-500 uppercase italic">{validationErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-[#768390] uppercase tracking-widest">Contact Phone</p>
              <input
                ref={phoneRef}
                type="text"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 10) handleInputChange('phone', val);
                }}
                onBlur={(e) => checkDuplicate('phone', e.target.value)}
                className={`w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-xs text-white font-mono outline-none transition-all ${validationErrors.phone ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-[#30363d] focus:border-[#f0883e]'}`}
                placeholder="10 Digits"
              />
              {validationErrors.phone && <p className="text-[8px] font-bold text-red-500 uppercase italic">{validationErrors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-[#768390] uppercase tracking-widest">Access Clearance (Role)</p>
              <select
                value={formData.roleId}
                onChange={(e) => handleInputChange('roleId', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                required
              >
                <option value="">Select Access Node</option>
                {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-[#768390] uppercase tracking-widest">Security Credentials (Password)</p>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={editingEmployee ? "Leave blank to preserve" : "Leave blank to auto-generate & email"}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-xs text-white focus:border-[#f0883e] outline-none"
                required={false}
              />
            </div>
          </div>

          {state.data.security?.captcha?.authorizePersonnel && !editingEmployee && (
            <div className="pt-2">
              <Captcha onVerify={setIsCaptchaVerified} />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
              <ShieldAlert size={18} className="text-red-500" />
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5">
            <button
              type="button" onClick={handleCloseModal}
              className="px-6 py-3 text-[10px] font-black text-[#768390] uppercase tracking-[0.2em] hover:text-white transition-all"
            >
              Abort Protocol
            </button>
            <button
              type="submit"
              className="px-10 py-3 bg-[#f0883e] text-black text-[10px] font-black rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              Execute Authorization
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
