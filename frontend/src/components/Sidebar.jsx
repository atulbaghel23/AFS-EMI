import React, { useState } from 'react';
import { state } from '../state';

import {
  LayoutDashboard,
  Users,
  Construction,
  CreditCard,
  HandCoins,
  History,
  Settings,
  Activity as ActivityIcon,
  Wrench,
  LayoutGrid,
  Layers,
  ChevronDown,
  FileText,
  BarChart3
} from 'lucide-react';

import { hasPermission } from '../utils';

const Sidebar = () => {
  const { view, user, fmcContracts = [] } = state.data;
  const [collapsedMenus, setCollapsedMenus] = useState({});

  // OEM MENU
  const oemItems = [
    {
      id: 'oem-dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      module: 'dashboard'
    },
    {
      id: 'report-center',
      icon: BarChart3,
      label: 'Report',
      module: 'dashboard'
    },
    {
      id: 'customers',
      icon: Users,
      label: 'Customers',
      module: 'customers'
    },
    {
      id: 'employees',
      icon: Users,
      label: 'Employees',
      module: 'employees'
    },
    {
      id: 'machines',
      icon: Construction,
      label: 'Machines',
      module: 'machines'
    },
    {
      id: 'financing',
      icon: CreditCard,
      label: 'Financing',
      module: 'financing',
      subItems: [
        {
          id: 'new-financing',
          label: 'New Financing',
          module: 'new_financing'
        },
        {
          id: 'financing-pipeline',
          label: 'Financing Pipeline',
          module: 'new_financing'
        },
        {
          id: 'financed-machines',
          label: 'Financed Machines',
          module: 'financed_machines'
        }
      ].filter((si) => hasPermission(user, si.module, 'read'))
    },
    {
      id: 'payments',
      icon: HandCoins,
      label: 'Settlements',
      module: 'settlements'
    },
    {
      id: 'invoice-search',
      icon: FileText,
      label: 'Invoice Search',
      module: 'financing'
    },
    {
      id: 'fmc-dashboard',
      icon: Layers,
      label: 'FMC',
      module: 'fmc',
      subItems: [
        {
          id: 'fmc-dashboard',
          label: 'FMC Dashboard',
          module: 'fmc'
        },
        {
          id: 'fmc-contracts',
          label: 'Contracts',
          module: 'fmc'
        },
        {
          id: 'fmc-supervisors',
          label: 'Field Operations',
          module: 'fmc'
        },
        {
          id: 'fmc-hours',
          label: 'Daily Hours',
          module: 'fmc'
        },
        {
          id: 'fmc-billing',
          label: 'Billing Engine',
          module: 'fmc'
        }
      ].filter((si) => hasPermission(user, si.module, 'read'))
    },
    {
      id: 'fmc-tickets',
      icon: Wrench,
      label: 'Service Desk',
      module: 'service_desk'
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      module: 'settings_general',
      subItems: [
        {
          id: 'settings-general',
          label: 'General Settings',
          module: 'settings_general'
        },
        {
          id: 'settings-rbac',
          label: 'Role Permissions',
          module: 'settings_rbac'
        },
        {
          id: 'settings-approval-flow',
          label: 'Approval Flows',
          module: 'settings_general'
        }
      ].filter((si) => hasPermission(user, si.module, 'read'))
    }
  ].filter((item) => hasPermission(user, item.module, 'read'));

  // CUSTOMER FMC CHECK
  const userCustId = (
    user?.customerId?._id || user?.customerId
  )?.toString();

  const isFMC =
    user?.type?.toUpperCase() === 'FMC' ||
    fmcContracts.some(
      (c) =>
        (
          c.customerId &&
          userCustId &&
          (c.customerId?._id || c.customerId)
            .toString() === userCustId
        ) ||
        c.customerName === user?.name
    );

  // CUSTOMER MENU
  const customerItems = isFMC
    ? [
      {
        id: 'fmc-dashboard',
        icon: LayoutGrid,
        label: 'FMC Dashboard'
      },
      {
        id: 'fmc-hours',
        icon: ActivityIcon,
        label: 'Machine Hours'
      },
      {
        id: 'fmc-tickets',
        icon: Wrench,
        label: 'Breakdown Desk'
      },
      {
        id: 'fmc-billing',
        icon: HandCoins,
        label: 'Monthly Billing'
      },
      {
        id: 'my-machines',
        icon: Construction,
        label: 'Fleet Assets'
      },
      {
        id: 'customer-payments',
        icon: History,
        label: 'Payment Ledger'
      }
    ]
    : [
      {
        id: 'customer-dashboard',
        icon: LayoutDashboard,
        label: 'Financing Hub'
      },
      {
        id: 'my-machines',
        icon: Construction,
        label: 'My Assets'
      },
      {
        id: 'customer-payments',
        icon: History,
        label: 'Payment Ledger'
      }
    ];

  // SUPERVISOR MENU
  const supervisorItems = [
    {
      id: 'fmc-dashboard',
      icon: LayoutGrid,
      label: 'FMC Dashboard'
    },
    {
      id: 'report-center',
      icon: BarChart3,
      label: 'Report Center'
    },
    {
      id: 'fmc-tickets',
      icon: Wrench,
      label: 'Breakdown Desk'
    },
    {
      id: 'fmc-hours',
      icon: ActivityIcon,
      label: 'Machine Hours'
    },
    {
      id: 'fmc-billing',
      icon: HandCoins,
      label: 'Invoices'
    },
    {
      id: 'invoice-search',
      icon: FileText,
      label: 'Invoice Search'
    }
  ];

  // FINAL MENU
  const menuItems =
    user?.role === 'OEM'
      ? oemItems
      : user?.role === 'SUPERVISOR'
        ? supervisorItems
        : customerItems;

  return (
    <aside className="w-64 border-r border-[#30363d] bg-[#0d1117] flex flex-col sticky top-0 h-screen shrink-0 z-50">

      {/* Logo */}
      <div className="p-8 flex flex-col items-start gap-2">
        <div className="h-16 w-40 object-contain brightness-0 invert opacity-90 transition-all duration-300">
          <img
            src="/logo.png"
            alt="LiuGong Logo"
            className="logo-image"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 mt-4 overflow-y-auto custom-scrollbar px-3 pb-8">

        <p className="px-5 text-[10px] font-black text-[#444c56] uppercase tracking-[0.2em] mb-4">
          System Console
        </p>

        <div className="space-y-1">

          {menuItems.map((item) => {
            const isActive =
              view === item.id ||
              item.subItems?.some((si) => si.id === view);

            const isExpanded = isActive && !collapsedMenus[item.id];

            return (
              <div key={item.id} className="relative">

                {/* Main Button */}
                <button
                  onClick={() => {
                    if (item.subItems) {
                      if (isActive) {
                        setCollapsedMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      } else {
                        setCollapsedMenus(prev => ({ ...prev, [item.id]: false }));
                        state.setState({
                          view: item.subItems[0].id
                        });
                      }
                    } else {
                      state.setState({
                        view: item.id
                      });
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] font-bold tracking-tight transition-all duration-200 rounded-xl ${isActive
                    ? 'bg-[#1c2128] text-[#f0883e] border border-[#30363d] shadow-lg'
                    : 'text-[#768390] hover:text-white hover:bg-[#161b22] border border-transparent'
                    }`}
                >
                  <item.icon
                    size={18}
                    className={
                      isActive
                        ? 'text-[#f0883e]'
                        : 'text-[#768390]'
                    }
                  />

                  <span className="truncate">
                    {item.label}
                  </span>

                  <div className="ml-auto flex items-center gap-2">
                    {item.subItems && (
                      <ChevronDown 
                        size={14} 
                        className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#f0883e]' : 'text-[#768390]'}`} 
                      />
                    )}
                    {isActive && !item.subItems && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f0883e] shadow-[0_0_8px_#f0883e]" />
                    )}
                  </div>
                </button>

                {/* Sub Menu */}
                {item.subItems && isExpanded && (
                  <div className="mt-1 ml-4 pl-4 border-l border-[#30363d] space-y-1 py-1">

                    {item.subItems.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() =>
                          state.setState({
                            view: sub.id
                          })
                        }
                        className={`w-full flex items-center gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 rounded-lg ${view === sub.id
                          ? 'text-[#f0883e] bg-[#f0883e]/5'
                          : 'text-[#444c56] hover:text-[#768390]'
                          }`}
                      >
                        {sub.label}
                      </button>
                    ))}

                  </div>
                )}

              </div>
            );
          })}

        </div>

      </nav>

    </aside>
  );
};

export default Sidebar;