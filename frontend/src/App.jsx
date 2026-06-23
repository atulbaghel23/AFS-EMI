import React, { useState, useEffect } from 'react';
import { state } from './state';
import LandingPage from './components/LandingPage.jsx';
import LoginPage from './components/LoginPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import CustomerManagement from './components/CustomerManagement.jsx';
import MachineManagement from './components/MachineManagement.jsx';
import LoanAssignment from './components/LoanAssignment.jsx';
import PaymentTracker from './components/PaymentTracker.jsx';
import LoanDetails from './components/DetailsView.jsx';
import CustomerAnalytics from './components/CustomerAnalytics.jsx';
import EmployeeManagement from './components/EmployeeManagement.jsx';
import GeneralSettings from './components/GeneralSettings.jsx';
import RBACSettings from './components/RBACSettings.jsx';
import ApprovalFlowSettings from './components/ApprovalFlowSettings.jsx';
import FMCDashboard from './components/FMCDashboard.jsx';
import FMCContracts from './components/FMCContracts.jsx';
import FMCSupervisors from './components/FMCSupervisors.jsx';
import FMCDailyHours from './components/FMCDailyHours.jsx';
import FMCTickets from './components/FMCTickets.jsx';
import FMCBilling from './components/FMCBilling.jsx';
import ORMDashboard from './components/ORMDashboard.jsx';
import ReportCenter from './components/ReportCenter/report.jsx';
import FinancingPipeline from './components/FinancingPipeline.jsx';
import ForceResetPasswordPage from './components/ForceResetPasswordPage.jsx';
import InvoiceSearch from './components/InvoiceSearch.jsx';

import { hasPermission, getFirstAuthorizedView } from './utils';

const App = () => {
  const [appState, setAppState] = useState(state.data);
  useEffect(() => {
    state.applySettings();
    const unsubscribe = state.subscribe((newData) => {
      setAppState({ ...newData });
    });
    return () => unsubscribe();
  }, []);

  const { view, user, isAuthenticated, loading } = appState;

  // Handle Full Screen Views
  if (view === 'landing') return <LandingPage />;
  if (view === 'login') return <LoginPage />;

  if (!isAuthenticated) {
    state.setState({ view: 'landing' });
    return null;
  }

  // Force password reset view if required
  if (user && user.mustResetPassword && view !== 'force-reset-password') {
    state.setState({ view: 'force-reset-password' });
    return null;
  }

  if (view === 'force-reset-password') return <ForceResetPasswordPage />;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-pulse">
          <div className="w-12 h-12 border-2 border-[#f0883e] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-[0.4em] font-mono">Establishing Secure Node Connection...</p>
        </div>
      );
    }

    const AccessDenied = () => (
      <div className="flex flex-col items-center justify-center py-40 space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <div className="text-red-500 text-3xl font-black italic">!</div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-text-main uppercase tracking-tighter italic">Security Clearance Required</h2>
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] mt-2 font-mono">Your profile lacks the protocol clearance for MODULE_{view.toUpperCase()}</p>
        </div>
        <button
          onClick={() => state.setState({ view: getFirstAuthorizedView(user) })}
          className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
        >
          Return to Primary Node
        </button>
      </div>
    );

    switch (view) {
      case 'oem-dashboard':
        if (user?.role !== 'OEM') return <AccessDenied />;
        if (!hasPermission(user, 'dashboard', 'read')) return <AccessDenied />;
        return <ORMDashboard />;
      case 'report-center':
        if (!hasPermission(user, 'dashboard', 'read')) return <AccessDenied />;
        return <ReportCenter />;
      case 'customer-dashboard':
        if (!hasPermission(user, 'dashboard', 'read')) return <AccessDenied />;
        return <Dashboard />;
      case 'customers':
        if (!hasPermission(user, 'customers', 'read')) return <AccessDenied />;
        return <CustomerManagement />;
      case 'machines':
      case 'my-machines':
        if (!hasPermission(user, 'machines', 'read')) return <AccessDenied />;
        return <MachineManagement />;
      case 'new-financing':
      case 'financed-machines':
        if (user?.type?.toUpperCase() === 'FMC' && user?.role !== 'OEM') return <AccessDenied />;
        if (user?.type?.toUpperCase() === 'FMC' && user?.role !== 'OEM') return <AccessDenied />;
        if (!hasPermission(user, 'financing', 'read')) return <AccessDenied />;
        return <LoanAssignment />;
      case 'financing-pipeline':
        if (!hasPermission(user, 'financing', 'read')) return <AccessDenied />;
        return <FinancingPipeline />;
      case 'payments':
      case 'customer-payments':
        if (!hasPermission(user, 'settlements', 'read')) return <AccessDenied />;
        return <PaymentTracker />;
      case 'invoice-search':
        return <InvoiceSearch />;
      case 'customer-analytics':
        if (!hasPermission(user, 'customers', 'read')) return <AccessDenied />;
        return <CustomerAnalytics />;
      case 'loan-details':
        if (user?.type?.toUpperCase() === 'FMC' && user?.role !== 'OEM') return <AccessDenied />;
        if (user?.type?.toUpperCase() === 'FMC' && user?.role !== 'OEM') return <AccessDenied />;
        if (!hasPermission(user, 'financing', 'read')) return <AccessDenied />;
        return <LoanDetails />;
      case 'employees':
        if (!hasPermission(user, 'employees', 'read')) return <AccessDenied />;
        return <EmployeeManagement />;
      case 'settings-general':
      case 'settings-rbac':
      case 'settings-approval-flow':
        if (!hasPermission(user, 'settings', 'read')) return <AccessDenied />;
        if (view === 'settings-general') return <GeneralSettings />;
        if (view === 'settings-rbac') return <RBACSettings />;
        return <ApprovalFlowSettings />;
      case 'fmc-tickets': {
        const ticketCustId = (user?.customerId?._id || user?.customerId)?.toString();
        const isTicketFMC = user?.type?.toUpperCase() === 'FMC' || (state.data.fmcContracts || []).some(c =>
          (c.customerId && ticketCustId && (c.customerId?._id || c.customerId).toString() === ticketCustId) ||
          (c.customerName === user?.name)
        );
        if (!isTicketFMC && user?.role !== 'OEM' && user?.role !== 'SUPERVISOR') return <AccessDenied />;
        if (!hasPermission(user, 'service_desk', 'read')) return <AccessDenied />;
        return <FMCTickets />;
      }
      case 'fmc-dashboard':
      case 'fmc-contracts':
      case 'fmc-supervisors':
      case 'fmc-hours':
      case 'fmc-billing':
      case 'fmc-invoices': {
        const userCustId = (user?.customerId?._id || user?.customerId)?.toString();
        const isFMC = user?.type?.toUpperCase() === 'FMC' || (state.data.fmcContracts || []).some(c =>
          (c.customerId && userCustId && (c.customerId?._id || c.customerId).toString() === userCustId) ||
          (c.customerName === user?.name)
        );
        if (!isFMC && user?.role !== 'OEM' && user?.role !== 'SUPERVISOR') return <AccessDenied />;
        if (!hasPermission(user, 'fmc', 'read')) return <AccessDenied />;

        switch (view) {
          case 'fmc-dashboard': return <FMCDashboard />;
          case 'fmc-contracts': return <FMCContracts />;
          case 'fmc-supervisors': return <FMCSupervisors />;
          case 'fmc-hours': return <FMCDailyHours />;
          case 'fmc-billing':
          case 'fmc-invoices': return <FMCBilling />;
          default: return <AccessDenied />;
        }
      }
      default:
        return <h2 className="text-2xl font-black text-text-main">View Not Found: {view}</h2>;
    }
  };

  return (
    <div className={`h-screen overflow-hidden ${appState.theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex h-full bg-bg-deep text-text-main selection:bg-primary/30 overflow-hidden transition-colors duration-500">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 transition-all relative overflow-hidden">
          <Header />
          <div id="content-area" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 lg:px-[4rem] pt-8 pb-24">
            <div className="max-w-[1600px] mx-auto">
              {renderContent()}
            </div>
          </div>
        </main>

        <div id="notification-zone" className="fixed bottom-6 right-6 z-[2000] flex flex-col pointer-events-none"></div>
      </div>
    </div>
  );
};

export default App;

