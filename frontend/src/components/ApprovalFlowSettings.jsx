import React, { useState, useEffect, useRef } from 'react';
import { state } from '../state';
import {
  Plus, Trash2, Edit3, Save, ArrowUp, ArrowDown,
  Layers, Settings as SettingsIcon, Check, X, Shield, User,
  ListOrdered, Power, ToggleLeft, ToggleRight, Info, Search, ChevronDown
} from 'lucide-react';
import { showNotification, confirmAction, hasPermission } from '../utils';

const PRESET_COLORS = [
  '#f85149', // Red
  '#ffa657', // Orange
  '#ffd700', // Yellow
  '#3fb950', // Green
  '#58a6ff', // Blue
  '#d2a8ff', // Purple
  '#768390', // Gray
  '#f0883e'  // Brand Orange
];

const ApprovalFlowSettings = () => {
  const [stateData, setStateData] = useState(state.data);
  const [activeTab, setActiveTab] = useState('statuses'); // 'statuses' or 'flows'

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#f0883e', description: '', allowedUsers: [] });

  // Flow Modal State
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [flowForm, setFlowForm] = useState({ name: '', isActive: true, steps: [], supervisorId: '' });

  // Searchable Supervisor Dropdown State
  const [supSearchTerm, setSupSearchTerm] = useState('');
  const [supDropdownOpen, setSupDropdownOpen] = useState(false);

  // Searchable Approver Staff Dropdown State
  const [activeApproverDropdownIndex, setActiveApproverDropdownIndex] = useState(null);
  const [approverSearchTerm, setApproverSearchTerm] = useState('');

  const supervisorRef = useRef(null);
  const approverContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supervisorRef.current && !supervisorRef.current.contains(event.target)) {
        setSupDropdownOpen(false);
      }
      if (approverContainerRef.current && !approverContainerRef.current.contains(event.target)) {
        setActiveApproverDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = state.subscribe(data => {
      setStateData(data);
    });
    return () => unsubscribe();
  }, []);

  const { ticketStatuses = [], approvalFlows = [], fmcSupervisors = [], user, employees = [], roles = [] } = stateData;
  const users = employees; // Use employees fetched by global state instead of local fetch

  // --- TICKET STATUS OPERATIONS ---
  const handleOpenStatusModal = (status = null) => {
    if (status) {
      setEditingStatus(status);
      setStatusForm({
        name: status.name,
        color: status.color,
        description: status.description || '',
        allowedUsers: (status.allowedUsers || []).map(u => typeof u === 'object' ? u._id : u)
      });
    } else {
      setEditingStatus(null);
      setStatusForm({ name: '', color: '#f0883e', description: '', allowedUsers: [] });
    }
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusForm.name.trim()) {
      showNotification('Status name is required', 'error');
      return;
    }

    const payload = {
      ...statusForm,
      _id: editingStatus ? editingStatus._id : undefined
    };

    const res = await state.saveTicketStatus(payload);
    if (res.success) {
      showNotification(editingStatus ? 'Status updated successfully' : 'Status created successfully', 'success');
      setStatusModalOpen(false);
    } else {
      showNotification(res.message || 'Failed to save status', 'error');
    }
  };

  const handleDeleteStatus = async (statusId) => {
    const ok = await confirmAction(
      'Delete Custom Status?',
      'This will remove this custom status. Make sure no tickets or approval flows are actively referencing it.',
      'warning'
    );
    if (ok) {
      const res = await state.deleteTicketStatus(statusId);
      if (res.success) {
        showNotification('Status deleted', 'success');
      } else {
        showNotification(res.message || 'Failed to delete status', 'error');
      }
    }
  };

  const toggleUserInStatusForm = (userId) => {
    setStatusForm(prev => {
      const isSelected = prev.allowedUsers.includes(userId);
      const newAllowed = isSelected
        ? prev.allowedUsers.filter(id => id !== userId)
        : [...prev.allowedUsers, userId];
      return { ...prev, allowedUsers: newAllowed };
    });
  };

  // --- APPROVAL FLOW OPERATIONS ---
  const handleOpenFlowModal = (flow = null) => {
    if (flow) {
      setEditingFlow(flow);
      setFlowForm({
        name: flow.name,
        isActive: flow.isActive,
        supervisorId: flow.supervisorId || '',
        steps: (flow.steps || []).map(s => ({
          sequence: s.sequence,
          approverId: typeof s.approverId === 'object' ? s.approverId._id : s.approverId,
          statusId: typeof s.statusId === 'object' ? s.statusId._id : s.statusId
        }))
      });
    } else {
      setEditingFlow(null);
      setFlowForm({ name: '', isActive: true, steps: [], supervisorId: '' });
    }
    setSupSearchTerm('');
    setSupDropdownOpen(false);
    setActiveApproverDropdownIndex(null);
    setApproverSearchTerm('');
    setFlowModalOpen(true);
  };

  const handleSupervisorChange = (selectedId) => {
    const supervisor = fmcSupervisors.find(s => s._id === selectedId);
    // Check if a flow already exists for this supervisor/scope
    const existingFlow = approvalFlows.find(f => {
      if (supervisor && supervisor.approvalFlowId) {
        return f._id === supervisor.approvalFlowId;
      }
      const flowSup = f.supervisorId || '';
      const targetSup = selectedId || '';
      return flowSup === targetSup;
    });

    if (existingFlow) {
      setEditingFlow(existingFlow);
      setFlowForm({
        name: existingFlow.name,
        isActive: existingFlow.isActive,
        supervisorId: selectedId,
        steps: (existingFlow.steps || []).map(s => ({
          sequence: s.sequence,
          approverId: typeof s.approverId === 'object' ? s.approverId._id : s.approverId,
          statusId: typeof s.statusId === 'object' ? s.statusId._id : s.statusId
        }))
      });
      showNotification('Loaded existing approval flow configuration', 'info');
    } else {
      setEditingFlow(null);
      const selectedSupervisor = fmcSupervisors.find(s => s._id === selectedId);
      const defaultName = selectedSupervisor ? `Approval Flow for ${selectedSupervisor.name}` : 'Default Ticket Approval Flow';
      setFlowForm({
        name: defaultName,
        isActive: true,
        supervisorId: selectedId,
        steps: []
      });
    }
  };

  // Determine which employees are available to select for flow steps
  const getStepApprovers = () => {
    const eligibleUsers = users.filter(u => hasPermission(u, 'service_desk', 'update'));
    if (flowForm.supervisorId) {
      const selectedSupervisor = fmcSupervisors.find(s => s._id === flowForm.supervisorId);
      if (selectedSupervisor && selectedSupervisor.assignedEmployees && selectedSupervisor.assignedEmployees.length > 0) {
        return eligibleUsers.filter(u => selectedSupervisor.assignedEmployees.includes(u._id.toString()));
      }
    }
    return eligibleUsers;
  };

  const handleAddStep = () => {
    const availableApprovers = getStepApprovers();
    setFlowForm(prev => {
      const newStep = {
        sequence: prev.steps.length + 1,
        approverId: availableApprovers[0]?._id || '',
        statusId: ticketStatuses[0]?._id || ''
      };
      return { ...prev, steps: [...prev.steps, newStep] };
    });
  };

  const handleRemoveStep = (index) => {
    setFlowForm(prev => {
      const newSteps = prev.steps.filter((_, i) => i !== index).map((s, idx) => ({
        ...s,
        sequence: idx + 1
      }));
      return { ...prev, steps: newSteps };
    });
  };

  const handleUpdateStep = (index, key, val) => {
    setFlowForm(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], [key]: val };
      return { ...prev, steps: newSteps };
    });
  };

  const handleMoveStep = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= flowForm.steps.length) return;

    setFlowForm(prev => {
      const newSteps = [...prev.steps];
      const temp = newSteps[index];
      newSteps[index] = newSteps[targetIndex];
      newSteps[targetIndex] = temp;

      const sequenceFixedSteps = newSteps.map((s, idx) => ({
        ...s,
        sequence: idx + 1
      }));
      return { ...prev, steps: sequenceFixedSteps };
    });
  };

  const handleSaveFlow = async () => {
    if (!flowForm.name.trim()) {
      showNotification('Flow name is required', 'error');
      return;
    }
    if (flowForm.steps.length === 0) {
      showNotification('Flow must contain at least one step', 'error');
      return;
    }

    const isValid = flowForm.steps.every(s => s.approverId && s.statusId);
    if (!isValid) {
      showNotification('Please select both approver and status for all steps', 'error');
      return;
    }

    const targetSupervisor = flowForm.supervisorId || '';
    const isDup = approvalFlows.some(f => {
      if (editingFlow && f._id === editingFlow._id) return false;
      const flowSupervisor = f.supervisorId || '';
      return flowSupervisor === targetSupervisor;
    });

    if (isDup) {
      showNotification('An approval flow already exists for this supervisor/scope. You can only edit the existing flow.', 'error');
      return;
    }

    const payload = {
      ...flowForm,
      _id: editingFlow ? editingFlow._id : undefined
    };

    const res = await state.saveApprovalFlow(payload);
    if (res.success) {
      showNotification(editingFlow ? 'Approval Flow updated' : 'Approval Flow created', 'success');
      setFlowModalOpen(false);
    } else {
      showNotification(res.message || 'Failed to save flow', 'error');
    }
  };

  const handleDeleteFlow = async (flowId) => {
    const ok = await confirmAction(
      'Delete Approval Flow?',
      'This will delete this approval sequence settings permanently.',
      'warning'
    );
    if (ok) {
      const res = await state.deleteApprovalFlow(flowId);
      if (res.success) {
        showNotification('Approval flow deleted', 'success');
      } else {
        showNotification(res.message || 'Failed to delete flow', 'error');
      }
    }
  };

  const handleToggleFlowActive = async (flow) => {
    const res = await state.saveApprovalFlow({
      ...flow,
      isActive: !flow.isActive
    });
    if (res.success) {
      showNotification(`Flow state updated: ${flow.name}`);
    } else {
      showNotification(res.message || 'Operation failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-border-main pb-4">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight uppercase italic flex items-center gap-3">
            <SettingsIcon className="text-primary animate-spin-slow" size={24} /> Approval Flow Settings
          </h2>
          <p className="text-[10px] font-bold text-text-dim/60 uppercase tracking-[0.2em] mt-1 font-mono">
            Define customized ticket statuses and multi-step approval workflows
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-bg-card border border-border-main p-1.5 rounded-2xl shadow-inner">
          <button
            onClick={() => setActiveTab('statuses')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'statuses'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-dim hover:text-text-main'
              }`}
          >
            Ticket Statuses
          </button>
          <button
            onClick={() => setActiveTab('flows')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'flows'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-dim hover:text-text-main'
              }`}
          >
            Approval Flows
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
        <Info size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-text-dim">
          <p className="font-bold text-text-main uppercase text-[9px] tracking-wider mb-1">Workflow Logic Guide</p>
          <p>
            When a supervisor raises a ticket, the ticket starts in step 1 of the active approval flow.
            The designated employee must review and approve it. Upon approval, the ticket transitions to that step's custom status
            and routes to the next step. Admin specifies custom statuses and limits who can directly set each status.
          </p>
        </div>
      </div>

      {/* --- TAB CONTENT: TICKET STATUSES --- */}
      {activeTab === 'statuses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest pl-1">Custom Ticket Statuses</h3>
            <button
              onClick={() => handleOpenStatusModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[11px] font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={14} /> CREATE TICKET STATUS
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ticketStatuses.map(status => {
              const allowed = status.allowedUsers || [];
              return (
                <div key={status._id} className="bg-bg-card border border-border-main rounded-2xl p-5 hover:border-primary/30 transition-all flex flex-col justify-between group shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border"
                        style={{
                          background: `${status.color}15`,
                          color: status.color,
                          borderColor: `${status.color}30`
                        }}
                      >
                        {status.name}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenStatusModal(status)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg-active text-text-dim hover:text-primary border border-border-main/50"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteStatus(status._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg-active text-text-dim hover:text-red-500 border border-border-main/50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-text-dim/80 mb-4 italic min-h-[32px]">{status.description || 'No description provided.'}</p>
                  </div>

                  <div className="pt-4 border-t border-border-main/40">
                    <p className="text-[9px] font-black text-text-dim uppercase tracking-wider mb-2">Authorized Users to Assign</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allowed.length === 0 ? (
                        <span className="text-[9px] font-bold text-text-dim/50 uppercase">Anyone (No restrictions)</span>
                      ) : (
                        allowed.map((u, i) => (
                          <span key={u._id || i} className="flex items-center gap-1 px-2 py-0.5 bg-bg-active border border-border-main rounded text-[9px] font-bold text-text-main">
                            <User size={8} /> {u.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {ticketStatuses.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-border-main rounded-3xl">
                <Shield size={36} className="mx-auto text-text-dim/40 mb-3" />
                <p className="text-[10px] font-bold text-text-dim/60 uppercase tracking-widest">No custom statuses configured yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: APPROVAL FLOWS --- */}
      {activeTab === 'flows' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest pl-1 font-mono">Workflow Configurations</h3>
            <button
              onClick={() => handleOpenFlowModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[11px] font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={14} /> CREATE APPROVAL FLOW
            </button>
          </div>

          <div className="space-y-4">
            {approvalFlows.map(flow => {
              const assignedSups = fmcSupervisors.filter(s => {
                if (s.approvalFlowId !== undefined) {
                  return s.approvalFlowId === flow._id;
                }
                return flow.supervisorId && s._id === flow.supervisorId;
              });
              return (
                <div key={flow._id} className={`bg-bg-card border rounded-2xl p-6 transition-all ${flow.isActive ? 'border-primary/40 shadow-[0_10px_30px_rgba(240,136,62,0.05)]' : 'border-border-main'
                  }`}>
                  <div className="flex items-center justify-between border-b border-border-main/50 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-bold text-text-main text-sm uppercase tracking-tight">{flow.name}</h4>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                          <span className="text-[9px] font-mono text-text-dim/60">STEPS: {flow.steps?.length || 0}</span>
                          {assignedSups.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] text-text-dim/60 uppercase font-mono font-bold">Supervisors:</span>
                              {assignedSups.map(s => (
                                <span key={s._id} className="text-[9px] text-[#ffa657] font-black uppercase tracking-wider bg-[#ffa657]/10 px-2 py-0.5 rounded border border-[#ffa657]/20">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[9px] text-[#ffa657] font-black uppercase tracking-wider bg-[#ffa657]/10 px-2 py-0.5 rounded border border-[#ffa657]/20">
                              {flow.supervisorId ? 'No Supervisors Assigned' : 'Scope: Global Default'}
                            </span>
                          )}
                        </div>
                      </div>
                    {flow.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black uppercase tracking-wider">
                        ACTIVE PROTOCOL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-white/5 text-[8px] font-black uppercase tracking-wider">
                        INACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleFlowActive(flow)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${flow.isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-slate-800/50 text-slate-400 border-border-main hover:bg-bg-active'
                        }`}
                    >
                      {flow.isActive ? (
                        <>Active <Check size={10} /></>
                      ) : (
                        <>Activate</>
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenFlowModal(flow)}
                      className="p-2 bg-bg-active border border-border-main hover:border-primary/50 rounded-lg text-text-dim hover:text-primary transition-all"
                      title="Edit Workflow Steps"
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteFlow(flow._id)}
                      className="p-2 bg-bg-active border border-border-main hover:border-red-500/50 rounded-lg text-text-dim hover:text-red-500 transition-all"
                      title="Decommission Flow"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Steps Visual Chain */}
                <div className="flex flex-wrap items-center gap-4 py-2 overflow-x-auto no-scrollbar">
                  {flow.steps?.map((step, idx) => {
                    const stepStatus = step.statusId || {};
                    const stepApprover = step.approverId || {};
                    return (
                      <React.Fragment key={idx}>
                        <div className="bg-bg-deep border border-border-main/60 rounded-xl p-3 flex items-center gap-3 min-w-[200px] relative shadow-inner">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black font-mono">
                            {step.sequence}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-text-main uppercase tracking-tight truncate max-w-[130px]">
                              {stepApprover.name || 'Unknown User'}
                            </p>
                            <span
                              className="inline-block mt-1 text-[8px] font-black uppercase tracking-wider"
                              style={{ color: stepStatus.color || '#fff' }}
                            >
                              Approves to: {stepStatus.name || 'Unknown Status'}
                            </span>
                          </div>
                        </div>
                        {idx < flow.steps.length - 1 && (
                          <div className="text-text-dim/40 font-black font-mono">➔</div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {(!flow.steps || flow.steps.length === 0) && (
                    <p className="text-[9px] font-black text-text-dim/40 uppercase tracking-widest">No approval steps defined for this flow</p>
                  )}
                </div>
              </div>
              );
            })}

            {approvalFlows.length === 0 && (
              <div className="py-16 text-center border border-dashed border-border-main rounded-3xl">
                <ListOrdered size={36} className="mx-auto text-text-dim/40 mb-3 animate-pulse" />
                <p className="text-[10px] font-bold text-text-dim/60 uppercase tracking-widest">No approval flows configured yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT TICKET STATUS --- */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-bg-card border border-border-main rounded-3xl shadow-2xl overflow-hidden animate-in scale-in duration-300">
            <div className="px-8 py-5 border-b border-border-main flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-text-main uppercase tracking-tight flex items-center gap-2">
                  <Shield className="text-primary" size={18} />
                  {editingStatus ? 'Update Status Identity' : 'Register Custom Ticket Status'}
                </h3>
                <p className="text-[9px] font-mono text-text-dim/60 uppercase tracking-widest mt-0.5">Admin Protocol Console</p>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="p-2 hover:bg-bg-active rounded-xl text-text-dim hover:text-text-main transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Status Identifier (Name)</label>
                <input
                  type="text"
                  value={statusForm.name}
                  onChange={e => setStatusForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Approved By Tech Manager"
                  className="w-full bg-bg-deep border border-border-main rounded-xl px-4 py-3 text-xs font-bold text-text-main focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Visual Color Scheme</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-border-main shadow-inner transition-colors"
                    style={{ backgroundColor: statusForm.color }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setStatusForm(prev => ({ ...prev, color: c }))}
                        className={`w-7 h-7 rounded-lg border transition-all ${statusForm.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                          }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Operational Description</label>
                <textarea
                  value={statusForm.description}
                  onChange={e => setStatusForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Summarize the meaning of this status..."
                  className="w-full bg-bg-deep border border-border-main rounded-xl px-4 py-3 text-xs font-bold text-text-main focus:border-primary outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">
                  Assigner Restriction (Who can set this status)
                </label>
                <p className="text-[8px] text-text-dim/80 font-mono uppercase tracking-wider mb-2">
                  Select which employees are authorized to give/set this status. Leaving empty allows anyone.
                </p>

                <div className="border border-border-main bg-bg-deep rounded-2xl p-4 max-h-[160px] overflow-y-auto custom-scrollbar space-y-2">
                  {users.map(u => {
                    const isSelected = statusForm.allowedUsers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => toggleUserInStatusForm(u._id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-black/10 border-transparent hover:bg-black/25 text-text-dim'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <User size={12} />
                          </div>
                          <span className="text-xs font-bold uppercase">{u.name}</span>
                        </div>
                        {isSelected && <Check size={14} className="stroke-[3]" />}
                      </div>
                    );
                  })}
                  {users.length === 0 && (
                    <p className="text-[9px] font-bold text-text-dim/50 uppercase tracking-widest text-center py-4">No employees registered under OEM</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-border-main flex items-center justify-end gap-3 bg-bg-active/20">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="px-6 py-2.5 border border-border-main text-text-dim rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-text-main transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatus}
                className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Save size={12} /> {editingStatus ? 'UPDATE STATUS' : 'SAVE STATUS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT APPROVAL FLOW --- */}
      {flowModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-bg-card border border-border-main rounded-3xl shadow-2xl overflow-hidden animate-in scale-in duration-300">
            <div className="px-8 py-5 border-b border-border-main flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-text-main uppercase tracking-tight flex items-center gap-2">
                  <ListOrdered className="text-primary" size={18} />
                  {editingFlow ? 'Configure Flow Steps' : 'Design Approval Sequence'}
                </h3>
                <p className="text-[9px] font-mono text-text-dim/60 uppercase tracking-widest mt-0.5">Workflow Design Desk</p>
              </div>
              <button
                onClick={() => setFlowModalOpen(false)}
                className="p-2 hover:bg-bg-active rounded-xl text-text-dim hover:text-text-main transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Flow Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Flow Protocol Name</label>
                <input
                  type="text"
                  value={flowForm.name}
                  onChange={e => setFlowForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Standard Breakdown Approval Protocol"
                  className="w-full bg-bg-deep border border-border-main rounded-xl px-4 py-3 text-xs font-bold text-text-main focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Scope / Supervisor Assignment with Search */}
              <div className="space-y-1.5 relative" ref={supervisorRef}>
                <label className="text-[10px] font-black text-text-dim uppercase tracking-wider">Scope (Supervisor Context)</label>
                <div className="relative">
                  {/* Selected Item / Search Input Display */}
                  <div
                    onClick={() => setSupDropdownOpen(!supDropdownOpen)}
                    className="w-full bg-bg-deep border border-border-main rounded-xl px-4 py-3 text-xs font-bold text-text-main focus-within:border-primary outline-none transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">
                      {flowForm.supervisorId
                        ? `Dedicated to Supervisor: ${fmcSupervisors.find(s => s._id === flowForm.supervisorId)?.name || 'Unknown'}`
                        : 'Global Default (All Supervisors)'}
                    </span>
                    <ChevronDown size={14} className={`text-text-dim transition-transform ${supDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown Container */}
                  {supDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 z-50 bg-bg-card border border-border-main rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Search Input */}
                      <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim/60" />
                        <input
                          type="text"
                          value={supSearchTerm}
                          onChange={e => setSupSearchTerm(e.target.value)}
                          placeholder="Search supervisors..."
                          className="w-full bg-bg-deep border border-border-main rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-text-main focus:border-primary outline-none"
                          onClick={e => e.stopPropagation()} // Prevent closing dropdown on input click
                        />
                      </div>

                      {/* Options List */}
                      <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-1">
                        {/* Global Default Option */}
                        <div
                          onClick={() => {
                            handleSupervisorChange('');
                            setSupDropdownOpen(false);
                            setSupSearchTerm('');
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${!flowForm.supervisorId
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-text-dim hover:bg-bg-deep hover:text-text-main'
                            }`}
                        >
                          Global Default (All Supervisors)
                        </div>

                        {/* Filtered Supervisors */}
                        {fmcSupervisors
                          .filter(s =>
                            s.name.toLowerCase().includes(supSearchTerm.toLowerCase())
                          )
                          .map(s => {
                            const isSelected = flowForm.supervisorId === s._id;
                            return (
                              <div
                                key={s._id}
                                onClick={() => {
                                  handleSupervisorChange(s._id);
                                  setSupDropdownOpen(false);
                                  setSupSearchTerm('');
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-text-dim hover:bg-bg-deep hover:text-text-main'
                                  }`}
                              >
                                Dedicated to Supervisor: {s.name}
                              </div>
                            );
                          })}

                        {fmcSupervisors.filter(s =>
                          s.name.toLowerCase().includes(supSearchTerm.toLowerCase())
                        ).length === 0 && supSearchTerm && (
                            <div className="text-center py-4 text-[10px] font-bold text-text-dim/50 uppercase tracking-widest">
                              No supervisors match search
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[8px] text-text-dim/80 font-mono uppercase tracking-wider">
                  If assigned, this workflow will only apply to tickets raised by or associated with this supervisor.
                </p>
              </div>

              {/* Steps Area */}
              <div className="space-y-3" ref={approverContainerRef}>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-wider pl-1">Approval Steps Chain</label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                  >
                    <Plus size={10} /> Add Approval Step
                  </button>
                </div>

                <div className="space-y-3">
                  {flowForm.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-bg-deep border border-border-main rounded-2xl p-4 relative group hover:border-primary/20 transition-all">
                      {/* Step Indicator */}
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black font-mono shrink-0">
                        {idx + 1}
                      </div>

                      {/* Select Approver with Search */}
                      <div className="flex-1 space-y-1 relative">
                        <span className="text-[8px] font-black text-text-dim uppercase tracking-wider block">Approver Staff</span>
                        <div className="relative">
                          {/* Trigger Display */}
                          <div
                            onClick={() => {
                              if (activeApproverDropdownIndex === idx) {
                                setActiveApproverDropdownIndex(null);
                              } else {
                                setActiveApproverDropdownIndex(idx);
                                setApproverSearchTerm('');
                              }
                            }}
                            className="w-full bg-bg-card border border-border-main rounded-lg px-3 py-2 text-xs font-bold text-text-main focus:border-primary outline-none flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">
                              {(() => {
                                const stepApprovers = getStepApprovers();
                                const selectedApprover = stepApprovers.find(u => u._id === step.approverId);
                                return selectedApprover ? `${selectedApprover.name} (${selectedApprover.email})` : 'Select approver...';
                              })()}
                            </span>
                            <ChevronDown size={12} className={`text-text-dim transition-transform ${activeApproverDropdownIndex === idx ? 'rotate-180' : ''}`} />
                          </div>

                          {/* Dropdown Container */}
                          {activeApproverDropdownIndex === idx && (
                            <div className="absolute left-0 right-0 mt-1 z-50 bg-bg-card border border-border-main rounded-xl shadow-2xl p-2 space-y-2 animate-in fade-in duration-200">
                              {/* Search box */}
                              <div className="relative">
                                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim/60" />
                                <input
                                  type="text"
                                  value={approverSearchTerm}
                                  onChange={e => setApproverSearchTerm(e.target.value)}
                                  placeholder="Search approvers..."
                                  className="w-full bg-bg-deep border border-border-main rounded-md pl-7 pr-2.5 py-1 text-xs font-bold text-text-main focus:border-primary outline-none"
                                  onClick={e => e.stopPropagation()} // Prevent close on click
                                />
                              </div>

                              {/* Options List */}
                              <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-0.5">
                                <div
                                  onClick={() => {
                                    handleUpdateStep(idx, 'approverId', '');
                                    setActiveApproverDropdownIndex(null);
                                    setApproverSearchTerm('');
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!step.approverId
                                      ? 'bg-primary/10 text-primary'
                                      : 'text-text-dim hover:bg-bg-deep hover:text-text-main'
                                    }`}
                                >
                                  Select approver...
                                </div>
                                {getStepApprovers()
                                  .filter(u =>
                                    u.name.toLowerCase().includes(approverSearchTerm.toLowerCase()) ||
                                    u.email.toLowerCase().includes(approverSearchTerm.toLowerCase())
                                  )
                                  .map(u => {
                                    const isSelected = step.approverId === u._id;
                                    return (
                                      <div
                                        key={u._id}
                                        onClick={() => {
                                          handleUpdateStep(idx, 'approverId', u._id);
                                          setActiveApproverDropdownIndex(null);
                                          setApproverSearchTerm('');
                                        }}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isSelected
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-dim hover:bg-bg-deep hover:text-text-main'
                                          }`}
                                      >
                                        {u.name} ({u.email})
                                      </div>
                                    );
                                  })}
                                {getStepApprovers().filter(u =>
                                  u.name.toLowerCase().includes(approverSearchTerm.toLowerCase()) ||
                                  u.email.toLowerCase().includes(approverSearchTerm.toLowerCase())
                                ).length === 0 && approverSearchTerm && (
                                    <div className="text-center py-2 text-[9px] font-bold text-text-dim/50 uppercase tracking-widest">
                                      No matches found
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Select Applied Status */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[8px] font-black text-text-dim uppercase tracking-wider">Apply Status on Approval</span>
                        <select
                          value={step.statusId}
                          onChange={e => handleUpdateStep(idx, 'statusId', e.target.value)}
                          className="w-full bg-bg-card border border-border-main rounded-lg px-3 py-2 text-xs font-bold text-text-main focus:border-primary outline-none"
                        >
                          <option value="">Select status...</option>
                          {ticketStatuses.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Controls (UP, DOWN, REMOVE) */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end">
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 bg-bg-active border border-border-main rounded hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'down')}
                          disabled={idx === flowForm.steps.length - 1}
                          className="p-1.5 bg-bg-active border border-border-main rounded hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ArrowDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1.5 bg-bg-active border border-border-main rounded hover:text-red-500 transition-all text-text-dim"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {flowForm.steps.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-border-main/50 rounded-2xl">
                      <p className="text-[9px] font-black text-text-dim/40 uppercase tracking-widest">No approval chain steps initialized. Click Add Approval Step to begin.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-border-main flex items-center justify-end gap-3 bg-bg-active/20">
              <button
                onClick={() => setFlowModalOpen(false)}
                className="px-6 py-2.5 border border-border-main text-text-dim rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-text-main transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFlow}
                className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Save size={12} /> {editingFlow ? 'UPDATE FLOW' : 'SAVE FLOW'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalFlowSettings;
