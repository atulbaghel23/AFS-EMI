import React, { useState, useEffect } from 'react';
import { state } from '../state';
import {
  Mail, Bell, Settings2, Code, Layout, Save, RefreshCw,
  Variable, Check, X, AlertCircle, Send, Info, Eye, Trash2,
  Lock, Globe, User, Hash, ChevronRight, MessageSquare
} from 'lucide-react';
import { showNotification } from '../utils';

const NotificationSettings = () => {
  const { user, smtp, notificationTriggers } = state.data;
  const isAdmin = (user?.role || '').toUpperCase().includes('ADMIN') || (user?.role || '').toUpperCase().includes('SUPER');

  const [activeSubTab, setActiveSubTab] = useState('triggers'); // triggers, templates, smtp, logs
  const [localSmtp, setLocalSmtp] = useState(smtp || {});
  const [localNotifications, setLocalNotifications] = useState(notificationTriggers || {});
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (smtp) setLocalSmtp(smtp);
    if (notificationTriggers) setLocalNotifications({
      ...notificationTriggers,
      overdue_interval: state.data.notificationTriggers?.overdue_interval || 7
    });
  }, [smtp, notificationTriggers]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('https://afs-emi.vercel.app/api/notifications/templates');
      const data = await res.json();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) setSelectedTemplate(data[0]);
    } catch (err) {
      showNotification('Failed to fetch templates', 'error');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('https://afs-emi.vercel.app/api/notifications/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      showNotification('Failed to fetch logs', 'error');
    }
  };

  const saveSmtpSettings = async () => {
    setIsSaving(true);
    try {
      await state.updateConfig({ smtp: localSmtp });
      showNotification('SMTP Node Authorized', 'success');
    } catch (err) {
      showNotification('Sync Failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!localSmtp.host || !localSmtp.user || !localSmtp.pass) {
      showNotification('Incomplete Configuration', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('https://afs-emi.vercel.app/api/notifications/test-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSmtp)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
      } else {
        showNotification(data.message || 'Connection Failed', 'error');
      }
    } catch (err) {
      showNotification('Network Failure during Test', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveTriggerSettings = async () => {
    setIsSaving(true);
    try {
      await state.updateConfig({ notifications: localNotifications });
      showNotification('Notification Triggers Synced', 'success');
    } catch (err) {
      showNotification('Sync Failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      const res = await fetch('https://afs-emi.vercel.app/api/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTemplate)
      });
      if (res.ok) {
        showNotification('Template Logic Persisted', 'success');
        fetchTemplates();
      } else {
        showNotification('Update Failed', 'error');
      }
    } catch (err) {
      showNotification('Network Error', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTemplate = (eventKey) => {
    const existing = templates.find(t => t.event === eventKey);
    if (existing) {
      setSelectedTemplate(existing);
    } else {
      const eventInfo = eventList.find(e => e.id === eventKey);
      setSelectedTemplate({
        name: eventInfo.label,
        event: eventKey,
        subject: `Notification: ${eventInfo.label}`,
        body: `Hello {{name}},\n\nThis is an automated message regarding ${eventInfo.label}.\n\nThank you,\nLiuGong Team`,
        enabled: true,
        channels: ['email']
      });
    }
  };

  const insertVariable = (variable) => {
    if (!selectedTemplate) return;
    const body = selectedTemplate.body || '';
    // This is a simple insertion at the end, a more advanced one would use cursor position
    setSelectedTemplate({
      ...selectedTemplate,
      body: body + ` {{${variable}}}`
    });
  };

  const eventList = [
    { id: 'customer_welcome', label: 'New Customer Welcome', desc: 'Send login details to new customers', icon: User },
    { id: 'employee_welcome', label: 'Staff Account Setup', desc: 'Send login details to new staff', icon: Lock },
    { id: 'emi_reminder', label: 'Payment Reminder', desc: 'Remind customers about upcoming payments', icon: Bell },
    { id: 'overdue_alert', label: 'Overdue Payment Alert', desc: 'Notify customers about missed payments', icon: AlertCircle }
  ];

  const availableVariables = [
    { key: 'name', label: 'Full Name', desc: 'Name of the person' },
    { key: 'customId', label: 'ID Number', desc: 'Unique ID' },
    { key: 'email', label: 'Email', desc: 'Email address' },
    { key: 'username', label: 'Username', desc: 'Login username' },
    { key: 'password', label: 'Password', desc: 'Login password' },
    { key: 'loginUrl', label: 'Login Link', desc: 'Link to log in' },
    { key: 'machineName', label: 'Machine Name', desc: 'Name of the equipment' },
    { key: 'amount', label: 'Amount', desc: 'Money amount' },
    { key: 'dueDate', label: 'Due Date', desc: 'Payment deadline' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Emails & Notifications</h2>
          <p className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">Manage Templates & Email Settings</p>
        </div>
        <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
          {[
            { id: 'triggers', label: 'Triggers', icon: Settings2 },
            { id: 'templates', label: 'Templates', icon: Layout },
            { id: 'smtp', label: 'Email Server', icon: globe },
            { id: 'logs', label: 'History', icon: RefreshCw }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-[#f0883e] text-black shadow-lg' : 'text-slate-500 hover:text-white'
                  }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeSubTab === 'triggers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#f0883e]/10 text-[#f0883e] rounded-xl flex items-center justify-center border border-[#f0883e]/20">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Automatic Triggers</h3>
                  <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Choose when to send emails</p>
                </div>
              </div>

              <div className="space-y-4">
                {eventList.map(item => {
                  const Icon = item.icon;
                  return (
                    <React.Fragment key={item.id}>
                      <div className="flex items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl group hover:border-[#f0883e]/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-[#f0883e] transition-colors">
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setLocalNotifications({ ...localNotifications, [item.id]: !localNotifications[item.id] })}
                            className={`w-12 h-6 rounded-full transition-all relative ${localNotifications[item.id] ? 'bg-[#3fb950]' : 'bg-[#30363d]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localNotifications[item.id] ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                      {item.id === 'overdue_alert' && localNotifications.overdue_alert && (
                        <div className="px-5 pb-5 -mt-2 animate-in slide-in-from-top-2 duration-300">
                          <div className="bg-[#0d1117] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-white uppercase tracking-widest">Alert Recurrence Interval</p>
                              <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">Days between recurring notices</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={localNotifications.overdue_interval || 7}
                                onChange={(e) => setLocalNotifications({ ...localNotifications, overdue_interval: parseInt(e.target.value) || 1 })}
                                className="w-16 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-[#f0883e] font-mono font-black text-center focus:border-[#f0883e] outline-none"
                              />
                              <span className="text-[9px] font-black text-slate-500 uppercase">Days</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>

              <button
                onClick={saveTriggerSettings}
                disabled={isSaving}
                className="w-full py-4 bg-[#f0883e] text-black text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ffab70] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Settings
              </button>
            </div>

            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">How it works</h3>
                  <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Email Delivery Information</p>
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-4">
                <p className="text-[10px] text-blue-400 font-bold uppercase leading-relaxed italic">
                  All notifications are settings-driven. Disabling a trigger completely bypasses the mailing microservice for that event.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Transactional Mail (SMTP/SendGrid)',
                    'Dynamic Variable Substitution',
                    'Delivery Status Tracking',
                    'Automatic Retry Mechanisms',
                    'Template Version Control'
                  ].map(spec => (
                    <div key={spec} className="flex items-center gap-2 text-[9px] font-black text-slate-500">
                      <Check size={10} className="text-blue-500" /> {spec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'smtp' && (
          <div className="max-w-3xl mx-auto glass-card p-10 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-[#f0883e]/10 text-[#f0883e] rounded-2xl flex items-center justify-center border border-[#f0883e]/20">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Email Server Settings</h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">Setup the server to send emails</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">SMTP Host</label>
                <input
                  type="text"
                  value={localSmtp.host || ''}
                  onChange={(e) => setLocalSmtp({ ...localSmtp, host: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-4 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                  placeholder="smtp.provider.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">SMTP Port</label>
                <input
                  type="number"
                  value={localSmtp.port || ''}
                  onChange={(e) => setLocalSmtp({ ...localSmtp, port: parseInt(e.target.value) })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-4 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Username / Auth Key</label>
                <input
                  type="text"
                  value={localSmtp.user || ''}
                  onChange={(e) => setLocalSmtp({ ...localSmtp, user: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-4 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                  placeholder="user@domain.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Secret Password</label>
                <input
                  type="password"
                  value={localSmtp.pass || ''}
                  onChange={(e) => setLocalSmtp({ ...localSmtp, pass: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-4 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                  placeholder="••••••••••••"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Sent From (Name & Email)</label>
                <input
                  type="text"
                  value={localSmtp.from || ''}
                  onChange={(e) => setLocalSmtp({ ...localSmtp, from: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-4 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                  placeholder="EMI Portal <no-reply@domain.com>"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-white/5">
              <button
                onClick={saveSmtpSettings}
                disabled={isSaving}
                className="flex-1 py-4 bg-[#f0883e] text-black text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ffab70] transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Server Settings
              </button>
              <button
                onClick={testConnection}
                disabled={isSaving}
                className="flex-1 py-4 bg-white/5 text-white text-[10px] font-black rounded-xl uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Test Connection
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'templates' && (
          <div className="flex gap-6 h-[700px] animate-in slide-in-from-bottom-4 duration-500">
            {/* Template Selector */}
            <div className="w-80 glass-card !p-0 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/5 bg-black/20">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Message Templates</h4>
                <p className="text-[8px] text-slate-500 font-mono uppercase mt-1">Select an event to edit its email</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {eventList.map(event => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectTemplate(event.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all mb-1 group ${selectedTemplate?.event === event.id ? 'bg-[#f0883e]/10 border border-[#f0883e]/30 text-[#f0883e]' : 'hover:bg-white/5 text-slate-400'
                      }`}
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest">{event.label}</p>
                      <p className="text-[8px] font-mono mt-1 opacity-60 uppercase">{event.id}</p>
                    </div>
                    <ChevronRight size={14} className={selectedTemplate?.event === event.id ? 'opacity-100' : 'opacity-20'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            {selectedTemplate ? (
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex-1 glass-card p-0 overflow-hidden flex flex-col">
                  <div className="p-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#f0883e]/10 text-[#f0883e] rounded-xl flex items-center justify-center border border-[#f0883e]/20">
                        <Code size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Message Setup</h3>
                        <p className="text-[9px] text-[#f0883e] font-mono uppercase font-bold italic">{selectedTemplate.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button className="p-3 bg-white/5 text-slate-500 rounded-xl hover:text-white transition-all">
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={saveTemplate}
                        disabled={isSaving}
                        className="px-8 py-3 bg-[#f0883e] text-black text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-[#ffab70] transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                      >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Message
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Content Editor */}
                    <div className="flex-1 flex flex-col p-8 gap-6 border-r border-white/5 overflow-y-auto custom-scrollbar">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Mail Subject</label>
                        <input
                          type="text"
                          value={selectedTemplate.subject || ''}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-5 py-4 text-xs text-white font-bold focus:border-[#f0883e] outline-none"
                          placeholder="Subject Line"
                        />
                      </div>

                      <div className="flex-1 flex flex-col space-y-2 min-h-[300px]">
                        <div className="flex items-center justify-between pl-1">
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Email Message Content</label>
                            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">No coding needed. Just type your message.</p>
                          </div>
                          <div className="flex items-center gap-2 text-[8px] font-mono text-emerald-500 font-black uppercase">
                            <Check size={10} /> Professional Branding Active
                          </div>
                        </div>
                        <textarea
                          value={selectedTemplate.body || ''}
                          onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                          className="flex-1 w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 text-xs text-slate-300 font-medium leading-relaxed focus:border-[#f0883e] outline-none resize-none custom-scrollbar shadow-inner"
                          placeholder="Write your message here... Use variables on the right to personalize."
                        />
                        <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl">
                          <p className="text-[8px] font-black text-slate-600 uppercase italic">
                            System Note: Your text will be automatically formatted into a professional LiuGong branded email layout.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Variable Registry */}
                    <div className="w-72 p-6 bg-black/20 flex flex-col gap-6">
                      <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Variable size={12} className="text-[#f0883e]" /> Variable Registry
                        </h4>
                        <p className="text-[8px] text-slate-500 font-mono uppercase mt-1 leading-tight">Click to Inject Variable</p>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {availableVariables.map(v => (
                          <button
                            key={v.key}
                            onClick={() => insertVariable(v.key)}
                            className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#f0883e]/50 group transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-mono font-black text-[#f0883e] tracking-tighter">{"{{"}{v.key}{"}}"}</span>
                              <Plus size={10} className="text-slate-600 group-hover:text-white transition-colors" />
                            </div>
                            <p className="text-[8px] font-black text-white uppercase tracking-wider">{v.label}</p>
                            <p className="text-[7px] text-slate-600 font-bold uppercase mt-1 leading-none">{v.desc}</p>
                          </button>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl bg-[#f0883e]/5 border border-[#f0883e]/10">
                        <p className="text-[8px] font-black text-[#f0883e] uppercase leading-relaxed italic">
                          Variables are automatically mapped from the triggering event's data payload.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 glass-card flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Layout size={32} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">No Node Selected</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">Select a template to begin evolution</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="glass-card !p-0 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-black/20 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Transmission Logs</h3>
                <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Real-time Delivery Audit</p>
              </div>
              <button onClick={fetchLogs} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#161b22] z-10">
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#768390] tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#768390] tracking-widest">Event</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#768390] tracking-widest">Recipient</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#768390] tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase text-[#768390] tracking-widest text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No transmission records found</td>
                    </tr>
                  ) : logs.map(log => (
                    <tr key={log._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-[10px] font-mono font-bold text-white uppercase">
                        {new Date(log.createdAt).toLocaleString('en-GB', { hour12: false }).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-black text-white uppercase tracking-tight">{log.event.replace('_', ' ')}</div>
                        <div className="text-[8px] font-mono text-[#f0883e] uppercase font-bold">{log.channel}</div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{log.recipient}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${log.status === 'Sent' ? 'bg-[#3fb950]/10 text-[#3fb950]' :
                          log.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Plus = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const globe = Globe; // Mapping for lowercase icon ref

export default NotificationSettings;
