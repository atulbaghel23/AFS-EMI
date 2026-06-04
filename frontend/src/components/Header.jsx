import React, { useState, useRef, useEffect } from 'react';
import { state } from '../state';
import {
  Bell,
  Settings,
  Power,
  Activity,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';

const Header = () => {
  const { view, user, theme, settings, notifications } = state.data;
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSettings = user?.settings || settings;

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    state.setState({ theme: nextTheme });
    if (user && currentSettings) {
      state.updateSettings({ ...currentSettings, theme: nextTheme });
    }
  };

  const viewNames = {
    'oem-dashboard': 'Strategic Analytics',
    'customer-dashboard': 'My Portfolio',
    'customers': 'Client Ledger',
    'machines': 'Equipment Catalog',
    'loans': 'Financing Hub',
    'payments': 'Ledger & Settlements',
    'my-machines': 'My Equipment',
    'customer-payments': 'Ledger Statement',
    'customer-analytics': 'Strategic Analytics'
  };

  const handleLogout = () => state.logout();

  return (
    <header className="h-16 border-b border-border-main bg-glass-bg px-6 lg:px-[4rem] flex items-center sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-text-main uppercase italic tracking-tighter flex items-center gap-3">
            {viewNames[view] || view.replace(/-/g, ' ')}
          </h2>
          <div className="h-6 w-px bg-border-main" />
          <div className="flex items-center gap-2 px-2.5 py-1 bg-bg-active border border-border-main rounded-md shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse shadow-[0_0_8px_#3fb950]" />
            <span className="text-[9px] font-black text-[#3fb950] font-mono uppercase tracking-widest">Active Session</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={handleThemeToggle}
              className="w-9 h-9 flex items-center justify-center text-text-dim hover:text-text-main transition-all hover:bg-bg-active rounded-lg group"
              title={theme === 'dark' ? "Switch to Photonic Theme" : "Switch to Abyssal Theme"}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="group-hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon size={18} className="group-hover:-rotate-12 transition-transform duration-300 text-slate-400" />
              )}
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-9 h-9 flex items-center justify-center transition-all rounded-lg relative group ${showNotifications ? 'text-text-main bg-bg-active shadow-inner' : 'text-text-dim hover:text-text-main hover:bg-bg-active'}`}
                title="Notifications"
              >
                <Bell size={18} className={`transition-transform ${showNotifications ? '' : 'group-hover:rotate-12'}`} />
                {notifications.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#f85149] rounded-full border border-bg-card" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-bg-card border border-border-main rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-border-main flex justify-between items-center bg-[#161b22]">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">System Alerts</h3>
                    <span className="text-[9px] bg-[#f0883e]/20 text-[#f0883e] px-2 py-0.5 rounded font-black tracking-widest">{notifications.length} New</span>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className="px-4 py-3 border-b border-border-main last:border-0 hover:bg-bg-active transition-colors cursor-pointer group"
                          onClick={() => {
                            if (n.targetView) state.setState({ view: n.targetView });
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-[#f0883e] transition-colors">{n.title}</h4>
                            <span className="text-[9px] font-mono text-text-dim">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-text-dim leading-snug">{n.body}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-text-dim text-xs font-bold uppercase tracking-widest">No new alerts</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pl-6 border-l border-border-main">
            <div className="flex items-center gap-3 bg-bg-active border border-border-main rounded-xl pl-3 pr-1.5 py-1.5 hover:border-text-dim/50 transition-all group cursor-default shadow-lg">
              <div className="text-right">
                <p className="text-[11px] font-black text-white leading-none uppercase tracking-tight">{user?.name || 'Authorized Admin'}</p>
                <p className="text-[8px] text-[#768390] font-mono uppercase tracking-tighter mt-1 font-bold">
                  {user?.isSuperAdmin ? 'Master Node Administrator' : (user?.roleId?.name || user?.role || 'Authorized Personnel')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-[#f85149] text-white rounded-lg flex items-center justify-center hover:bg-[#ff7b72] transition-all shadow-lg active:scale-90"
                title="Logout"
              >
                <Power size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
