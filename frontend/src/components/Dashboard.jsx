import React, { useState } from 'react';
import { state } from '../state';
import { formatINR } from '../utils';
import {
  TrendingUp, AlertCircle, Truck, History, ShieldCheck,
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity as ActivityIcon,
  Wrench, HandCoins, Construction, Download
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, accent, trend, isUp }) => (
  <div className="bg-bg-card border border-border-main rounded-xl p-5 group hover:border-text-dim transition-all relative overflow-hidden shadow-sm">
    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8" />
    <div className="flex items-center justify-between mb-4">
      <span className="text-[10px] font-bold text-text-dim tracking-widest font-mono uppercase">{label}</span>
      <div className={`p-1.5 bg-bg-deep border border-border-main rounded-lg group-hover:scale-110 group-hover:border-primary/30 transition-all`}>
        <Icon size={14} className={accent} />
      </div>
    </div>
    <div className="flex items-baseline justify-between">
      <div className="text-xl font-black text-text-main font-mono tracking-tighter">{value}</div>
      {trend && (
        <div className={`flex items-center gap-0.5 text-[10px] font-bold font-mono ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trend}
        </div>
      )}
    </div>
  </div>
);

const CustomerDashboard = () => {
  const { loans, user } = state.data;
  const clientLoans = loans.filter(l => {
    const loanCustId = (l.customerId?._id || l.customerId)?.toString();
    const userCustId = (user?.customerId?._id || user?.customerId)?.toString();
    return loanCustId && userCustId && loanCustId === userCustId;
  });

  const totalFinanced = clientLoans.reduce((sum, l) => sum + (l.principal || 0), 0);

  let totalPaidAmt = 0;
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let lastPaymentDate = null;

  clientLoans.forEach(loan => {
    const paid = (loan.schedule || []).filter(s => s.status === 'Paid');
    const pending = (loan.schedule || []).filter(s => s.status === 'Pending');

    totalPaidAmt += paid.length * (loan.emi || 0);

    const nextInstallment = pending.length > 0 ? pending[0] : loan.schedule[loan.schedule.length - 1];
    if (nextInstallment) {
      totalOutstanding += nextInstallment.balance || 0;
    }

    pending.forEach(s => {
      if (new Date(s.dueDate) < new Date()) {
        overdueAmount += loan.emi;
      }
    });

    paid.forEach(s => {
      if (!lastPaymentDate || new Date(s.dueDate) > new Date(lastPaymentDate)) {
        lastPaymentDate = s.dueDate;
      }
    });
  });

  const nextPayment = clientLoans
    .flatMap(l => (l.schedule || []).filter(s => s.status === 'Pending'))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  return (
    <div className="space-y-8 animate-slide-up pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-bg-card border border-primary/30 rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-center">
          <span className="text-[11px] font-bold text-primary tracking-widest font-mono uppercase block mb-4">NEXT SETTLEMENT</span>
          <span className="text-3xl font-bold text-text-main font-mono mb-2">{nextPayment ? formatINR(nextPayment.emi) : 'CLEAR'}</span>
          {nextPayment && <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">DUE: {nextPayment.dueDate}</span>}
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} label="TOTAL PAID" value={formatINR(totalPaidAmt)} accent="text-[#3fb950]" />
          <StatCard icon={AlertCircle} label="OUTSTANDING BAL" value={formatINR(totalOutstanding)} accent="text-white" />
          <StatCard icon={History} label="OVERDUE AMOUNT" value={formatINR(overdueAmount)} accent="text-rose-500" />
          <StatCard icon={Truck} label="SECURED ASSETS" value={clientLoans.length} accent="text-primary" />
          <StatCard icon={History} label="TOTAL FINANCED" value={formatINR(totalFinanced)} accent="text-text-dim" />
          <StatCard icon={History} label="LAST PAYMENT" value={lastPaymentDate || '--'} accent="text-[#768390]" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-bg-card border border-border-main rounded-xl p-8">
          <h3 className="text-[11px] font-bold font-mono tracking-[0.2em] text-text-dim uppercase mb-6">Payment Terminal</h3>
          <div className="p-6 bg-bg-deep border border-border-main rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Next EMI Due</p>
              <p className="text-2xl font-bold text-text-main font-mono">{formatINR(nextPayment?.emi || 0)}</p>
            </div>
            <div className="w-px h-8 bg-border-main hidden sm:block"></div>
            <div>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Overdue Penalty</p>
              <p className="text-2xl font-bold text-rose-500 font-mono">{formatINR(overdueAmount)}</p>
            </div>
            <button className="px-6 py-3 bg-primary text-black font-black text-[11px] uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(240,136,62,0.15)] active:scale-95 whitespace-nowrap" disabled={!nextPayment}>Pay Now</button>
          </div>
        </section>
        <section className="bg-bg-card border border-border-main rounded-xl p-8 flex flex-col justify-between shadow-sm">
          <h3 className="text-[11px] font-bold font-mono tracking-[0.2em] text-text-dim uppercase mb-4">Strategic Support</h3>
          <p className="text-[12px] text-text-dim leading-relaxed">Access 24/7 technical assistance for your Liugong assets. Fast-track your service requests.</p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <button className="py-3 bg-bg-deep border border-border-main rounded-lg text-[10px] font-black text-text-main uppercase tracking-widest hover:bg-bg-active transition-all">Request NOC</button>
            <button className="py-3 bg-bg-deep border border-border-main rounded-lg text-[10px] font-black text-text-main uppercase tracking-widest hover:bg-bg-active transition-all">Contact Ops</button>
          </div>
        </section>
      </div>
    </div>
  );
};

const FMCCustomerDashboard = () => {
  const { fmcContracts, fmcTickets, fmcDailyHours, fmcInvoices, user, machines } = state.data;
  const myContracts = fmcContracts.filter(c =>
    (c.customerId && user?.customerId && c.customerId.toString() === user.customerId.toString()) ||
    (c.customerName === user?.name)
  );
  const myMachineIds = myContracts.flatMap(c => c.machines || []);
  const myMachines = machines.filter(m => myMachineIds.includes(m._id));
  const myMachineNames = myMachines.map(m => m.name);
  const myTickets = fmcTickets.filter(t => myMachineNames.includes(t.machineName));
  const myHours = fmcDailyHours.filter(d => myMachineNames.includes(d.machineName || d.machine));
  const myInvoices = fmcInvoices.filter(inv => myContracts.some(c => c._id === inv.contractId));
  const totalHours = myHours.reduce((sum, h) => sum + (h.totalHours || 0), 0);
  const activeTickets = myTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolvedTickets = myTickets.filter(t => t.status === 'Resolved' && t.updatedAt && t.createdAt);
  const avgMTTR = resolvedTickets.length > 0 ? (resolvedTickets.reduce((sum, t) => sum + (new Date(t.updatedAt) - new Date(t.createdAt)), 0) / resolvedTickets.length / (1000 * 60 * 60)).toFixed(1) : '0';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3"><ShieldCheck className="text-[#3fb950]" size={32} /> FMC Client Terminal</h2>
          <p className="text-[10px] font-bold text-[#768390] uppercase tracking-[0.3em] mt-1 flex items-center gap-2"><ActivityIcon size={12} className="text-[#3fb950]" /> Real-time Fleet Telemetry & Maintenance Ledger</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Construction} label="Fleet Assets" value={myMachines.length} accent="text-[#f0883e]" />
          <StatCard icon={ActivityIcon} label="Machine Hours" value={`${totalHours.toFixed(0)} hrs`} accent="text-[#58a6ff]" />
          <StatCard icon={Wrench} label="Breakdown Desk" value={activeTickets} accent="text-[#f85149]" />
          <StatCard icon={HandCoins} label="Monthly Billing" value={myInvoices.filter(i => i.status === 'Pending').length} accent="text-[#3fb950]" />
          <StatCard icon={History} label="Payment Ledger" value={myInvoices.filter(i => i.status === 'Paid').length} accent="text-[#adbac7]" />
          <StatCard icon={ActivityIcon} label="Mean MTTR" value={`${avgMTTR} hrs`} accent="text-[#ffab70]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Construction} label="Fleet Assets" value={myMachines.length} accent="text-primary" />
          <StatCard icon={ActivityIcon} label="Machine Hours" value={`${totalHours.toFixed(0)} hrs`} accent="text-blue-500" />
          <StatCard icon={Wrench} label="Breakdown Desk" value={activeTickets} accent="text-red-500" />
          <StatCard icon={HandCoins} label="Monthly Billing" value={myInvoices.filter(i => i.status === 'Pending').length} accent="text-green-500" />
          <StatCard icon={History} label="Payment Ledger" value={myInvoices.filter(i => i.status === 'Paid').length} accent="text-text-dim" />
          <StatCard icon={ActivityIcon} label="Mean MTTR" value={`${avgMTTR} hrs`} accent="text-primary-light" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-bg-card border border-border-main rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-border-main bg-bg-active/50 flex items-center justify-between"><h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Fleet Asset Ledger</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-bg-deep"><tr><th className="px-6 py-4 text-[9px] font-black uppercase text-text-dim">Asset</th><th className="px-6 py-4 text-[9px] font-black uppercase text-text-dim">Hours</th><th className="px-6 py-4 text-[9px] font-black uppercase text-text-dim">Contract</th><th className="px-6 py-4 text-[9px] font-black uppercase text-text-dim">Status</th></tr></thead>
              <tbody className="divide-y divide-border-main/50">
                {myMachines.map(m => (
                  <tr key={m._id} className="hover:bg-bg-active transition-colors group">
                    <td className="px-6 py-4"><p className="font-black text-text-main text-xs">{m.name}</p><p className="text-[9px] font-mono text-text-dim uppercase mt-0.5">{m.model}</p></td>
                    <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{myHours.filter(h => (h.machineName || h.machine) === m.name).reduce((s, h) => s + (h.totalHours || 0), 0).toFixed(0)} hrs</td>
                    <td className="px-6 py-4 text-[10px] text-text-dim">{myContracts.find(c => (c.machines || []).includes(m._id))?.agreementNumber || '—'}</td>
                    <td className="px-6 py-4">{myTickets.some(t => t.machineName === m.name && !['Resolved', 'Closed'].includes(t.status)) ? <span className="text-red-500 text-[8px] font-black uppercase tracking-widest">Down</span> : <span className="text-green-500 text-[8px] font-black uppercase tracking-widest">Live</span>}</td>
                  </tr>
                ))}
              </tbody></table></div>
          </section>
          <section className="bg-bg-card border border-border-main rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-border-main bg-bg-active/50"><h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Service Desk Activity</h3></div>
            <div className="p-6 space-y-4">
              {myTickets.slice(0, 5).map(t => (
                <div key={t._id} className="p-4 bg-bg-deep border border-border-main rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm">
                  <div className="flex items-center gap-4"><div className={`w-2 h-2 rounded-full ${t.status === 'Requested' ? 'bg-red-500' : 'bg-primary'} animate-pulse`} /><div><p className="text-[10px] font-black text-text-main uppercase">{t.ticketNumber}</p><p className="text-[9px] text-text-dim mt-1">{t.machineName}</p></div></div>
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{t.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6">Settlement Ledger</h3>
            <div className="space-y-4">
              {myInvoices.slice(0, 3).map(inv => (
                <div key={inv._id} className="p-4 bg-bg-deep border border-border-main rounded-xl hover:border-green-500/30 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold text-text-main font-mono">{inv.invoiceNumber}</span><span className="text-[9px] font-black text-green-500 uppercase">Settled</span></div>
                  <div className="flex justify-between items-end"><div><p className="text-[9px] font-bold text-text-dim uppercase">{inv.billingMonth}</p><p className="text-xl font-black text-text-main font-mono mt-1">{formatINR(inv.totalInvoice)}</p></div><button className="p-2 bg-white/10 rounded-lg text-text-dim hover:text-text-main transition-colors"><Download size={14} /></button></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  // const { user, fmcContracts } = state.data;
  // const isFMC = user?.type?.toUpperCase() === 'FMC' || fmcContracts.some(c =>
  //   (c.customerId && user?.customerId && c.customerId.toString() === user.customerId.toString()) ||
  //   (c.customerName === user?.name)
  // );

  // if (isFMC) return <FMCCustomerDashboard />;
  const { user, fmcContracts } = state.data;
  const isFMC = user?.type?.toUpperCase() === 'FMC' || fmcContracts.some(c =>
    (c.customerId && user?.customerId && c.customerId.toString() === user.customerId.toString()) ||
    (c.customerName === user?.name)
  );

  if (isFMC) return <FMCCustomerDashboard />;
  return <CustomerDashboard />;
};

export default Dashboard;
