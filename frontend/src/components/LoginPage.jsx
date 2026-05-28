import React, { useState } from 'react';
import { state } from '../state';

const LoginPage = () => {
  const [role, setRole] = useState('OEM');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Password Recovery States
  const [recoveryMode, setRecoveryMode] = useState(null); // null | 'request' | 'reset'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const accentColor = role === 'OEM' ? '#f0883e' : '#3b82f6';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await state.login(email, password, role);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handleOpenRecovery = () => {
    setRecoveryEmail(email);
    setRecoveryMode('request');
    setError('');
    setSuccessMessage('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const result = await state.sendRecoveryOtp(recoveryEmail);
    if (result.success) {
      setSuccessMessage(result.message);
      setRecoveryMode('reset');
    } else {
      setError(result.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const result = await state.resetPassword(recoveryEmail, otp, newPassword);
    if (result.success) {
      setSuccessMessage(result.message);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setRecoveryMode(null);
        setEmail(recoveryEmail);
        setSuccessMessage('');
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg-deep flex items-center justify-center p-8 overflow-hidden relative transition-colors duration-500">
      {/* Rough Edge Filter */}
      <svg style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}>
        <filter id="rough-edge">
          <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="4" seed="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" />
        </filter>
      </svg>

      {/* Realistic Background */}
      <div className="absolute inset-0 z-0">
        <img src="/excavator_reveal.png" className="w-full h-full object-cover opacity-60 scale-105" alt="Site" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/40 to-transparent"></div>
        <div
          className="absolute top-1/4 left-1/3 w-96 h-96 blur-[120px] rounded-full animate-pulse"
          style={{ backgroundColor: `${accentColor}1a` }}
        ></div>
      </div>

      {/* Holographic Terminal */}
      <div className="max-w-md w-full p-8 rounded-[2.5rem] bg-bg-card/40 backdrop-blur-xl border border-border-main shadow-2xl z-20 space-y-6 animate-fade-in">

        {/* Industrial Role Toggle */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[0.5rem] font-black text-slate-500 uppercase tracking-[0.4em]">Secure Access</p>
          <p className="text-[0.5rem] font-black text-slate-500 uppercase tracking-[0.4em]">Secure Access</p>
          <div className="flex items-center gap-4 p-1.5 bg-white/5 border border-white/10 rounded-[1.5rem] w-full">
            <button
              onClick={() => setRole('OEM')}
              className={`flex-1 py-2 rounded-[1rem] text-[0.5625rem] font-black uppercase tracking-widest transition-all cursor-pointer ${role === 'OEM' ? 'bg-[#f0883e] text-black shadow-lg shadow-orange-500/10' : 'text-slate-500 hover:text-[var(--text-main)]'}`}
            >
              ORM
            </button>
            <button
              onClick={() => setRole('CUSTOMER')}
              className={`flex-1 py-2 rounded-[1rem] text-[0.5625rem] font-black uppercase tracking-widest transition-all cursor-pointer ${role === 'CUSTOMER' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-text-dim hover:text-text-main'}`}
            >
              CLIENT
            </button>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="h-12 w-full flex items-center justify-center group transition-all duration-300">
            <img
              src="/logo.png"
              alt="LiuGong Logo"
              className="logo-image h-full object-contain brightness-0 invert opacity-90 group-hover:opacity-100 transition-all duration-300"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter italic">
              {role === 'OEM' ? 'ORM' : role} <span style={{ color: accentColor }}>PORTAL</span>
            </h2>
            <div className="h-px w-12 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          </div>
        </div>

        {recoveryMode === null ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">Identity</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'OEM' ? 'admin@liugong' : 'client@node'}
                  required
                  className="relative w-full !bg-bg-active/10 !border-border-main !text-text-main !p-4 !rounded-[1.25rem] focus:!bg-bg-active/20 transition-all outline-none text-xs"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">Cipher</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="relative w-full !bg-bg-active/10 !border-border-main !text-text-main !p-4 !rounded-[1.25rem] focus:!bg-bg-active/20 transition-all outline-none text-xs"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-500 text-[0.5rem] font-black uppercase tracking-widest text-center p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="text-green-500 text-[0.5rem] font-black uppercase tracking-widest text-center p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 font-black rounded-[1.25rem] uppercase tracking-[0.4em] text-[0.625rem] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl relative group overflow-hidden cursor-pointer"
              style={{ background: accentColor, color: role === 'OEM' ? 'black' : 'white' }}
            >
              <span className="relative z-10">Synchronize</span>
            </button>
          </form>
        ) : recoveryMode === 'request' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="text-center">
              <h3 className="text-[0.625rem] font-black text-slate-500 uppercase tracking-[0.2em]">Password Recovery</h3>
              <p className="text-[0.5rem] text-slate-400 mt-1 font-mono uppercase tracking-wider">Request OTP Code</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">Recovery Email</label>
              <div className="relative group">
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="relative w-full !bg-bg-active/10 !border-border-main !text-text-main !p-4 !rounded-[1.25rem] focus:!bg-bg-active/20 transition-all outline-none text-xs"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-500 text-[0.5rem] font-black uppercase tracking-widest text-center p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 font-black rounded-[1.25rem] uppercase tracking-[0.2em] text-[0.625rem] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl relative group overflow-hidden cursor-pointer bg-[#f0883e] text-black"
            >
              <span className="relative z-10">Send OTP Code</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center">
              <h3 className="text-[0.625rem] font-black text-slate-500 uppercase tracking-[0.2em]">Verify Recovery Code</h3>
              <p className="text-[0.5rem] text-slate-400 mt-1 font-mono uppercase tracking-wider">Set New Cipher</p>
            </div>

            <div className="space-y-2">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">OTP Code</label>
              <div className="relative group">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  required
                  maxLength={6}
                  className="relative w-full !bg-bg-active/10 !border-border-main !text-text-main !p-4 !rounded-[1.25rem] focus:!bg-bg-active/20 transition-all outline-none text-xs font-mono text-center tracking-[0.5em]"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">New Cipher (Password)</label>
              <div className="relative group">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="relative w-full !bg-bg-active/10 !border-border-main !text-text-main !p-4 !rounded-[1.25rem] focus:!bg-bg-active/20 transition-all outline-none text-xs"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.5625rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-4">Confirm Cipher</label>
              <div className="relative group">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="relative w-full !bg-bg-active/10 !border-border-main !text-text-main !p-4 !rounded-[1.25rem] focus:!bg-bg-active/20 transition-all outline-none text-xs"
                  style={{ borderColor: 'var(--border-main)' }}
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-500 text-[0.5rem] font-black uppercase tracking-widest text-center p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="text-green-500 text-[0.5rem] font-black uppercase tracking-widest text-center p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 font-black rounded-[1.25rem] uppercase tracking-[0.2em] text-[0.625rem] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl relative group overflow-hidden cursor-pointer bg-[#f0883e] text-black"
            >
              <span className="relative z-10">Recover Account</span>
            </button>
          </form>
        )}

        <div className="flex justify-between items-center px-4 text-[0.5rem] font-black text-slate-600 uppercase tracking-widest">
          {recoveryMode === null ? (
            <>
              <button
                type="button"
                className="hover:text-[var(--text-main)] transition-colors cursor-pointer"
                onClick={() => state.goBack()}
              >
                <i className="fas fa-arrow-left mr-2"></i> Abort
              </button>
              <button
                type="button"
                className="hover:text-[var(--text-main)] transition-colors underline decoration-white/10 underline-offset-4 cursor-pointer"
                onClick={handleOpenRecovery}
              >
                Account Recovery
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="hover:text-[var(--text-main)] transition-colors cursor-pointer"
                onClick={() => {
                  setRecoveryMode(null);
                  setError('');
                  setSuccessMessage('');
                }}
              >
                <i className="fas fa-arrow-left mr-2"></i> Cancel
              </button>
              {recoveryMode === 'reset' && (
                <button
                  type="button"
                  className="hover:text-[var(--text-main)] transition-colors underline decoration-white/10 underline-offset-4 cursor-pointer"
                  onClick={() => setRecoveryMode('request')}
                >
                  Resend OTP
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
