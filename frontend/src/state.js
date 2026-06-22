// src/state.js

// const BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://afs-emi.onrender.com/api';
const BASE_URL = 'https://afs-emi.onrender.com/api';
import { lightenDarkenColor } from './utils';

const INITIAL_STATE = {
  view: (() => {
    const storedFilters = JSON.parse(localStorage.getItem('app_filters') || '{}');
    if (storedFilters.view) return storedFilters.view;
    const user = JSON.parse(localStorage.getItem('emi_user'));
    if (!user) return 'landing';
    if (user.mustResetPassword) return 'force-reset-password';
    if (user.role === 'OEM') return 'oem-dashboard';
    if (user.role === 'SUPERVISOR') return 'fmc-dashboard';
    if (user.type?.toUpperCase() === 'FMC') return 'fmc-dashboard';
    return 'customer-dashboard';
  })(),
  theme: localStorage.getItem('emi_theme') || 'dark',
  user: JSON.parse(localStorage.getItem('emi_user')) || null,
  isAuthenticated: !!localStorage.getItem('emi_user'),
  categories: ['Wheeled', 'Crawler'],
  dieselTypes: ['BS IV', 'BS V', 'BS VI'],
  evTypes: ['Lithium-Ion', 'LFP', 'Hydrogen Cell'],
  transmissionTypes: ['Manual', 'Automatic', 'Hydrostatic (HST)', 'Power Shift', 'CVT', 'Electric Drive'],
  attachmentTypes: ['Bucket', 'Fork', 'Grapple'],
  customers: [],
  machines: [],
  loans: [],
  payments: [],
  employees: [],
  roles: [],
  fmcContracts: [],
  fmcTickets: [],
  fmcSupervisors: [],
  fmcDailyHours: [],
  fmcInvoices: [],
  ticketStatuses: [],
  approvalFlows: [],
  numbering: {
    customer: { mode: 'Manual', prefix: 'CUST', nextNumber: 1 },
    employee: { mode: 'Manual', prefix: 'EMP', nextNumber: 1 },
    supervisor: { mode: 'Manual', prefix: 'SUP', nextNumber: 1 }
  },
  security: {
    captcha: {
      onboardClient: false,
      authorizePersonnel: false,
      onboardSupervisor: false
    }
  },
  notifications: [
    { id: 1, title: 'Asset Authorized', body: 'New HEx-Loder registered to Yuvraj Singh', time: '2m ago', type: 'success', targetView: 'loans' },
    { id: 2, title: 'EMI Settlement', body: '₹96,488 received from John Construction', time: '1h ago', type: 'info', targetView: 'payments' },
    { id: 3, title: 'System Protocol', body: 'Daily amortization sync completed', time: '3h ago', type: 'system', targetView: 'oem-dashboard' }
  ],
  notificationTriggers: {
    customer_welcome: true,
    employee_welcome: true,
    emi_reminder: false,
    overdue_alert: false
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    from: 'EMI Portal <no-reply@emiportal.com>',
    secure: false
  },
  loanListView: JSON.parse(localStorage.getItem('app_filters') || '{}').loanListView || 'card',
  machineListView: JSON.parse(localStorage.getItem('app_filters') || '{}').machineListView || 'list',
  selectedCustomerId: JSON.parse(localStorage.getItem('app_filters') || '{}').selectedCustomerId || null,
  selectedLoanId: JSON.parse(localStorage.getItem('app_filters') || '{}').selectedLoanId || null,
  loading: false,
  settings: {
    fontFamily: 'Inter',
    fontSize: '14',
    accentColor: '#f0883e',
    customerColumns: {
      name: true,
      customId: true,
      mobile: true,
      email: true,
      gst: true,
      pan: true,
      bankAcc: true,
      ifsc: true,
      status: true,
      type: true,
      city: true,
      pin: true,
      address: true,
      control: true
    },
    employeeColumns: {
      name: true, customId: true, phone: true, email: true, role: true, status: true, control: true
    },
    machineColumns: {
      identity: true, status: true, specs: true, valuation: true, dataSync: true, control: true
    }
  }
};

class State {
  constructor() {
    this.data = { ...INITIAL_STATE, viewHistory: [] };
    this.listeners = [];
    this.applyTheme();
    this.applySettings();
    if (this.data.isAuthenticated) {
      this.init();
    }
  }

  get apiUrl() {
    return BASE_URL;
  }

  get token() {
    return this.data.user?.token;
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.data.user?.token) {
      headers['Authorization'] = `Bearer ${this.data.user.token}`;
    }
    return headers;
  }

  async updateSettings(settings) {
    if (!this.data.user) return;
    try {
      const res = await fetch(`${BASE_URL}/users/settings`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ userId: this.data.user._id, settings })
      });
      if (res.ok) {
        const newSettings = await res.json();
        this.data.user.settings = newSettings;
        localStorage.setItem('emi_user', JSON.stringify(this.data.user));
        this.applySettings();
        this.notify();
      }
    } catch (err) {
      console.error('Failed to update settings', err);
    }
  }

  async updateConfig(newConfig) {
    try {
      const res = await fetch(`${BASE_URL}/config`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const savedConfig = await res.json();
        this.setState({
          categories: savedConfig.categories,
          dieselTypes: savedConfig.dieselTypes,
          evTypes: savedConfig.evTypes,
          transmissionTypes: savedConfig.transmissionTypes,
          attachmentTypes: savedConfig.attachmentTypes,
          numbering: savedConfig.numbering,
          security: savedConfig.security,
          customerColumns: savedConfig.customerColumns,
          employeeColumns: savedConfig.employeeColumns,
          machineColumns: savedConfig.machineColumns,
          notificationTriggers: savedConfig.notifications,
          smtp: savedConfig.smtp
        });
      }
    } catch (err) {
      console.error('Failed to update system config', err);
    }
  }

  async updateNumbering(type, numbering) {
    const newNumbering = { ...this.data.numbering, [type]: numbering };
    await this.updateConfig({ numbering: newNumbering });
  }

  applySettings() {
    const s = this.data.user?.settings || this.data.settings;
    const fontMap = {
      'Inter': "'Inter', sans-serif",
      'Roboto': "'Roboto', sans-serif",
      'Outfit': "'Outfit', sans-serif",
      'Monospace': "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    };
    document.documentElement.style.setProperty('--font-family', fontMap[s.fontFamily] || fontMap['Inter']);

    // Apply Dynamic Font Size (Global Node Scale using zoom to scale absolute pixel sizes too)
    if (s.fontSize) {
      const baseSize = 14;
      const zoomLevel = parseFloat(s.fontSize) / baseSize;
      document.documentElement.style.zoom = zoomLevel;
    }

    // Apply Dynamic Color Palette
    const accent = s.accentColor || '#f0883e';
    document.documentElement.style.setProperty('--color-primary', accent);
    document.documentElement.style.setProperty('--color-primary-light', lightenDarkenColor(accent, 40));
    document.documentElement.style.setProperty('--color-primary-dark', lightenDarkenColor(accent, -30));
  }

  async fetchData() {
    return this.init(true);
  }

  async init(isRefresh = false) {
    if (!isRefresh) this.setState({ loading: true });
    try {
      const fetchJson = (url) => fetch(url, { headers: this.getHeaders() }).then(res => res.ok ? res.json() : []).catch(() => []);

      const [customers, machines, loans, payments, config, employees, roles,
        fmcContracts, fmcTickets, fmcSupervisors, fmcDailyHours, fmcInvoices, ticketStatuses, approvalFlows, categories] = await Promise.all([
          fetchJson(`${BASE_URL}/customers`),
          fetchJson(`${BASE_URL}/machines`),
          fetchJson(`${BASE_URL}/loans`),
          fetchJson(`${BASE_URL}/payments`),
          fetch(`${BASE_URL}/config`, { headers: this.getHeaders() }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          fetchJson(`${BASE_URL}/users?role=OEM`),
          fetchJson(`${BASE_URL}/roles`),
          fetchJson(`${BASE_URL}/fmc/contracts`),
          fetchJson(`${BASE_URL}/fmc/tickets`),
          fetchJson(`${BASE_URL}/fmc/supervisors`),
          fetchJson(`${BASE_URL}/fmc/daily-hours`),
          fetchJson(`${BASE_URL}/fmc/invoices`),
          fetchJson(`${BASE_URL}/fmc/ticket-statuses`),
          fetchJson(`${BASE_URL}/fmc/approval-flows`),
          fetchJson(`${BASE_URL}/machines/categories`),
        ]);

      this.setState({
        customers,
        machines,
        loans,
        payments,
        employees,
        roles,
        fmcContracts,
        fmcTickets,
        fmcSupervisors,
        fmcDailyHours,
        fmcInvoices,
        ticketStatuses,
        approvalFlows,
        categories: (categories && categories.length > 0) ? categories : (config.categories || this.data.categories),
        dieselTypes: config.dieselTypes || this.data.dieselTypes,
        evTypes: config.evTypes || this.data.evTypes,
        transmissionTypes: config.transmissionTypes || this.data.transmissionTypes,
        attachmentTypes: config.attachmentTypes || this.data.attachmentTypes,
        numbering: config.numbering || this.data.numbering,
        security: config.security || this.data.security,
        customerColumns: config.customerColumns || this.data.customerColumns,
        employeeColumns: config.employeeColumns || this.data.employeeColumns,
        machineColumns: config.machineColumns || this.data.machineColumns,
        notificationTriggers: config.notifications || this.data.notificationTriggers,
        smtp: config.smtp || this.data.smtp,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch data', err);
      this.setState({ loading: false });
    }
  }

  setState(newData) {
    // Sanitize collections to prevent "Unknown" ghosts
    if (newData.customers) newData.customers = newData.customers.filter(Boolean);
    if (newData.employees) newData.employees = newData.employees.filter(Boolean);
    if (newData.machines) newData.machines = newData.machines.filter(Boolean);

    if (newData.view && newData.view !== this.data.view && !newData._isBackNavigation) {
      const history = this.data.viewHistory || [];
      if (history[history.length - 1] !== this.data.view) {
        newData.viewHistory = [...history, this.data.view];
      }
    }

    this.data = { ...this.data, ...newData };
    if (newData.theme) {
      localStorage.setItem('emi_theme', this.data.theme);
      this.applyTheme();
    }

    // Persist UI states
    const persistKeys = ['view', 'loanListView', 'machineListView', 'selectedCustomerId', 'selectedLoanId'];
    const shouldPersist = persistKeys.some(k => newData[k] !== undefined);
    if (shouldPersist) {
      const filters = JSON.parse(localStorage.getItem('app_filters') || '{}');
      persistKeys.forEach(k => {
        if (this.data[k] !== undefined) filters[k] = this.data[k];
      });
      localStorage.setItem('app_filters', JSON.stringify(filters));
    }

    this.notify();
  }


  goBack() {
    const history = this.data.viewHistory || [];
    if (history.length > 0) {
      const newHistory = [...history];
      const previousView = newHistory.pop();
      this.setState({ view: previousView, viewHistory: newHistory, _isBackNavigation: true });
    } else {
      const defaultView = this.data.user?.role === 'OEM' ? 'oem-dashboard' : (this.data.user?.role === 'SUPERVISOR' ? 'fmc-dashboard' : (this.data.user?.type?.toUpperCase() === 'FMC' ? 'fmc-dashboard' : 'customer-dashboard'));
      this.setState({ view: defaultView });
    }
  }

  async login(email, password, role) {
    this.setState({ loading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('emi_user', JSON.stringify(data));
        const userWithBypass = {
          ...data,
          isSuperAdmin: data.email === 'oem@liugong.com',
          isSupervisor: data.role === 'SUPERVISOR'
        };
        const defaultView = data.mustResetPassword
          ? 'force-reset-password'
          : (data.role === 'OEM'
            ? 'oem-dashboard'
            : data.role === 'SUPERVISOR'
              ? 'fmc-dashboard'
              : (data.type?.toUpperCase() === 'FMC' || data.fmcContracts?.some(c => c.customerId === data.customerId || c.customerName === data.name))
                ? 'fmc-dashboard'
                : 'customer-dashboard');
        this.setState({
          user: userWithBypass,
          isAuthenticated: true,
          view: defaultView,
          loading: false
        });
        this.applySettings();
        await this.init();
        return { success: true };
      } else {
        this.setState({ loading: false });
        return { success: false, message: data.message };
      }
    } catch (err) {
      this.setState({ loading: false });
      return { success: false, message: 'Server connection failed' };
    }
  }

  async sendRecoveryOtp(email) {
    this.setState({ loading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      this.setState({ loading: false });
      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      this.setState({ loading: false });
      return { success: false, message: 'Server connection failed' };
    }
  }

  async resetPassword(email, otp, newPassword) {
    this.setState({ loading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: newPassword })
      });
      const data = await res.json();
      this.setState({ loading: false });
      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      this.setState({ loading: false });
      return { success: false, message: 'Server connection failed' };
    }
  }

  async forceResetPassword(newPassword) {
    this.setState({ loading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/force-reset-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      this.setState({ loading: false });
      if (res.ok) {
        if (this.data.user) {
          this.data.user.mustResetPassword = false;
          localStorage.setItem('emi_user', JSON.stringify(this.data.user));
        }
        const defaultView = this.data.user?.role === 'OEM'
          ? 'oem-dashboard'
          : this.data.user?.role === 'SUPERVISOR'
            ? 'fmc-dashboard'
            : (this.data.user?.type?.toUpperCase() === 'FMC' ? 'fmc-dashboard' : 'customer-dashboard');
        this.setState({
          user: this.data.user,
          view: defaultView
        });
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      this.setState({ loading: false });
      return { success: false, message: 'Server connection failed' };
    }
  }

  logout() {
    localStorage.removeItem('emi_user');
    this.setState({
      user: null,
      isAuthenticated: false,
      view: 'landing',
      customers: [],
      machines: [],
      loans: [],
      payments: []
    });
  }

  async addCustomer(customer) {
    let payload = { ...customer, type: customer.type || 'EMI' };
    if (payload.type === 'FMC') {
      const namePart = (customer.name || '').replace(/\s+/g, '').substring(0, 4);
      const mobilePart = (customer.mobile || '').slice(-4);
      payload.password = namePart + mobilePart;
    }
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      this.setState({ customers: [data, ...this.data.customers] });
      return data;
    } else {
      throw new Error(data.message || 'Failed to onboard client');
    }
  }

  async updateCustomer(id, customer) {
    let payload = { ...customer, type: customer.type || 'EMI' };
    if (payload.type === 'FMC' && !payload.password) {
      const namePart = (customer.name || '').replace(/\s+/g, '').substring(0, 4);
      const mobilePart = (customer.mobile || '').slice(-4);
      payload.password = namePart + mobilePart;
    }
    const res = await fetch(`${BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    this.setState({ customers: this.data.customers.map(c => c._id === id ? data : c) });
    return data;
  }

  async deleteCustomer(id) {
    await fetch(`${BASE_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    this.setState({ customers: this.data.customers.filter(c => c._id !== id) });
  }

  async addMachine(machine) {
    try {
      const res = await fetch(`${BASE_URL}/machines`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(machine)
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to add machine');
        this.setState({ machines: [data, ...this.data.machines] });
        return { success: true, data };
      } else {
        throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error('Add Machine Error:', err);
      return { success: false, message: err.message };
    }
  }

  async updateMachine(id, machine) {
    try {
      const res = await fetch(`${BASE_URL}/machines/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(machine)
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update machine');
        this.setState({ machines: this.data.machines.map(m => m._id === id ? data : m) });
        return { success: true, data };
      } else {
        throw new Error(`Server returned non-JSON response: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error('Update Machine Error:', err);
      return { success: false, message: err.message };
    }
  }

  async deleteMachine(id) {
    try {
      const res = await fetch(`${BASE_URL}/machines/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete machine');
      }
      this.setState({ machines: this.data.machines.filter(m => m._id !== id) });
      return { success: true };
    } catch (err) {
      console.error('Delete Machine Error:', err);
      return { success: false, message: err.message };
    }
  }

  async addLoan(loan) {
    try {
      const res = await fetch(`${BASE_URL}/loans`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(loan)
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          return { success: false, message: data.message || 'Asset authorization declined' };
        }
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      this.setState({ loans: [data, ...this.data.loans] });
      return { success: true, data };
    } catch (err) {
      console.error('Add Loan Error:', err);
      return { success: false, message: err.message };
    }
  }

  async approveLoan(loanId, action = 'Approved', notes = '') {
    try {
      const res = await fetch(`${BASE_URL}/loans/${loanId}/approve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      const list = this.data.loans.map(l => l._id === data._id ? data : l);
      this.setState({ loans: list });
      return { success: true, data };
    } catch (err) {
      console.error('Approve Loan Error:', err);
      return { success: false, message: err.message };
    }
  }

  async addPayment(payment) {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payment)
    });
    const data = await res.json();
    this.setState({ payments: [data, ...this.data.payments] });
    const loansRes = await fetch(`${BASE_URL}/loans`, { headers: this.getHeaders() });
    const loans = await loansRes.json();
    this.setState({ loans });
    return data;
  }

  async addEmployee(employee) {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...employee, role: 'OEM' })
    });
    if (!res.ok) throw new Error('Personnel authorization failed');
    const data = await res.json();
    this.setState({ employees: [data, ...this.data.employees] });
    return data;
  }

  async updateEmployee(id, employee) {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(employee)
    });
    if (!res.ok) throw new Error('Personnel profile sync failed');
    const data = await res.json();
    this.setState({ employees: this.data.employees.map(e => e._id === id ? data : e) });
    return data;
  }

  async deleteEmployee(id) {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Personnel revocation failed');
    this.setState({ employees: this.data.employees.filter(e => e._id !== id) });
  }

  async addRole(role) {
    const res = await fetch(`${BASE_URL}/roles`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(role)
    });
    if (!res.ok) throw new Error('Security profile initialization failed');
    const data = await res.json();
    this.setState({ roles: [data, ...this.data.roles] });
    return data;
  }

  async updateRole(id, role) {
    const originalRoles = [...this.data.roles];
    const optimisticRoles = this.data.roles.map(r => r._id === id ? { ...r, ...role } : r);
    this.setState({ roles: optimisticRoles });

    try {
      const res = await fetch(`${BASE_URL}/roles/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(role)
      });
      if (!res.ok) throw new Error('Security profile sync failed');
      const data = await res.json();
      this.setState({ roles: this.data.roles.map(r => r._id === id ? data : r) });
      return data;
    } catch (err) {
      console.error('Failed to update role', err);
      this.setState({ roles: originalRoles });
      throw err;
    }
  }

  async deleteRole(id) {
    await fetch(`${BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    this.setState({ roles: this.data.roles.filter(r => r._id !== id) });
  }

  async saveFMCContract(contract) {
    try {
      const isNew = !contract._id;
      const url = isNew ? `${BASE_URL}/fmc/contracts` : `${BASE_URL}/fmc/contracts/${contract._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(contract)
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const list = isNew ? [data, ...this.data.fmcContracts] : this.data.fmcContracts.map(c => c._id === data._id ? data : c);
      this.setState({ fmcContracts: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async deleteFMCContract(id) {
    try {
      await fetch(`${BASE_URL}/fmc/contracts/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      this.setState({ fmcContracts: this.data.fmcContracts.filter(c => c._id !== id) });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async saveFMCTicket(ticket) {
    try {
      const isNew = !ticket._id;
      const url = isNew ? `${BASE_URL}/fmc/tickets` : `${BASE_URL}/fmc/tickets/${ticket._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(ticket)
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const list = isNew ? [data, ...this.data.fmcTickets] : this.data.fmcTickets.map(t => t._id === data._id ? data : t);
      this.setState({ fmcTickets: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async deleteFMCTicket(id) {
    try {
      await fetch(`${BASE_URL}/fmc/tickets/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      this.setState({ fmcTickets: this.data.fmcTickets.filter(t => t._id !== id) });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async saveTicketStatus(status) {
    try {
      const isNew = !status._id;
      const url = isNew ? `${BASE_URL}/fmc/ticket-statuses` : `${BASE_URL}/fmc/ticket-statuses/${status._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(status)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      const list = isNew ? [data, ...this.data.ticketStatuses] : this.data.ticketStatuses.map(s => s._id === data._id ? data : s);
      this.setState({ ticketStatuses: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async deleteTicketStatus(id) {
    try {
      const res = await fetch(`${BASE_URL}/fmc/ticket-statuses/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete failed');
      }
      this.setState({ ticketStatuses: this.data.ticketStatuses.filter(s => s._id !== id) });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async saveApprovalFlow(flow) {
    try {
      const isNew = !flow._id;
      const url = isNew ? `${BASE_URL}/fmc/approval-flows` : `${BASE_URL}/fmc/approval-flows/${flow._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(flow)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      const list = isNew ? [data, ...this.data.approvalFlows] : this.data.approvalFlows.map(f => f._id === data._id ? data : f);
      this.setState({ approvalFlows: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async deleteApprovalFlow(id) {
    try {
      const res = await fetch(`${BASE_URL}/fmc/approval-flows/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete failed');
      }
      this.setState({ approvalFlows: this.data.approvalFlows.filter(f => f._id !== id) });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async approveTicket(ticketId, action, notes) {
    try {
      const res = await fetch(`${BASE_URL}/fmc/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      const list = this.data.fmcTickets.map(t => t._id === data._id ? data : t);
      this.setState({ fmcTickets: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async saveFMCSupervisor(supervisor) {
    try {
      const isNew = !supervisor._id;
      const url = isNew ? `${BASE_URL}/fmc/supervisors` : `${BASE_URL}/fmc/supervisors/${supervisor._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(supervisor)
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const list = isNew ? [data, ...this.data.fmcSupervisors] : this.data.fmcSupervisors.map(s => s._id === data._id ? data : s);
      this.setState({ fmcSupervisors: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async deleteFMCSupervisor(id) {
    try {
      await fetch(`${BASE_URL}/fmc/supervisors/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      this.setState({ fmcSupervisors: this.data.fmcSupervisors.filter(s => s._id !== id) });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async saveFMCDailyHour(entry) {
    try {
      const isNew = !entry._id;
      const url = isNew ? `${BASE_URL}/fmc/daily-hours` : `${BASE_URL}/fmc/daily-hours/${entry._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(entry)
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const list = isNew ? [data, ...this.data.fmcDailyHours] : this.data.fmcDailyHours.map(h => h._id === data._id ? data : h);
      this.setState({ fmcDailyHours: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async saveFMCInvoice(invoice) {
    try {
      const isNew = !invoice._id;
      const url = isNew ? `${BASE_URL}/fmc/invoices` : `${BASE_URL}/fmc/invoices/${invoice._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(invoice)
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      const list = isNew ? [data, ...this.data.fmcInvoices] : this.data.fmcInvoices.map(i => i._id === data._id ? data : i);
      this.setState({ fmcInvoices: list });
      return { success: true, data };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async deleteFMCInvoice(id) {
    try {
      await fetch(`${BASE_URL}/fmc/invoices/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      this.setState({ fmcInvoices: this.data.fmcInvoices.filter(i => i._id !== id) });
      return { success: true };
    } catch (err) { return { success: false, message: err.message }; }
  }

  async sendOverdueNotice(loanId) {
    try {
      const res = await fetch(`${BASE_URL}/notifications/send-overdue-notice`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ loanId })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error };
    } catch (err) {
      return { success: false, message: 'Notification Protocol Failure' };
    }
  }

  applyTheme() {
    const themes = ['dark', 'blue', 'green', 'brown'];
    themes.forEach(t => document.documentElement.classList.remove(t));
    if (this.data.theme && this.data.theme !== 'light') {
      document.documentElement.classList.add(this.data.theme);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.data));
  }
}

export const state = new State();
window.state = state;
export default state;
