'use client';

import React from 'react';
import { FaChartPie, FaList, FaCreditCard, FaMoneyBillWave, FaPiggyBank, FaCog } from 'react-icons/fa';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Resumen', icon: FaChartPie },
    { id: 'transactions', label: 'Movimientos', icon: FaList },
    { id: 'debts', label: 'Deudas', icon: FaCreditCard },
    { id: 'budgets', label: 'Presupuestos', icon: FaMoneyBillWave },
    { id: 'investments', label: 'Inversiones', icon: FaPiggyBank },
    { id: 'settings', label: 'Configuración', icon: FaCog },
  ];

  return (
    <aside className="w-full md:w-1/5 lg:w-1/6">
      <nav className="flex flex-row md:flex-col gap-1 md:gap-0 md:space-y-2 overflow-x-auto pb-2 md:pb-0" aria-label="Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-md font-medium text-sm transition-colors duration-200",
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
