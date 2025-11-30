'use client';

import React, { useState, useEffect } from 'react';
import { 
  LuLayoutDashboard, 
  LuList, 
  LuCreditCard, 
  LuWallet, 
  LuSettings, 
  LuMenu, 
  LuTestTube
} from 'react-icons/lu';
import clsx from 'clsx';
import { User } from 'firebase/auth';
import { isQAEnvironment } from '@/utils/env';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

export default function Sidebar({ activeTab, setActiveTab, user }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showQA, setShowQA] = useState(false);

  useEffect(() => {
    setShowQA(isQAEnvironment());
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Resumen', icon: LuLayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: LuList },
    { id: 'debts', label: 'Cuotas y Créditos', icon: LuCreditCard },
    { id: 'budgets', label: 'Presupuestos', icon: LuWallet },
    { id: 'settings', label: 'Configuración', icon: LuSettings },
  ];

  if (showQA) {
    tabs.push({ id: 'qa-tools', label: 'Herramientas QA', icon: LuTestTube });
  }

  return (
    <aside 
      className={clsx(
        "bg-surface border-r border-gray-200 dark:border-gray-800 h-[100-dvh] flex flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Header / Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className={clsx("font-bold text-xl text-brand-primary overflow-hidden whitespace-nowrap transition-all duration-300", 
          isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
        )}>
          AppCostos
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary transition-colors"
          aria-label="Toggle Menu"
        >
          <LuMenu className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative whitespace-nowrap",
              activeTab === tab.id
                ? "bg-blue-100 text-blue-600 dark:bg-gray-800 dark:text-white"
                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
              !isOpen && "justify-center"
            )}
            title={!isOpen ? tab.label : undefined}
          >
            <tab.icon className={clsx("w-6 h-6 flex-shrink-0", activeTab === tab.id && "text-blue-600 dark:text-white")} />
            
            <span className={clsx(
              "font-medium transition-all duration-300 origin-left",
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 hidden"
            )}>
              {tab.label}
            </span>

            {/* Tooltip for collapsed state */}
            {!isOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {tab.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className={clsx("flex items-center gap-3", !isOpen && "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className={clsx(
                "flex flex-col overflow-hidden transition-all duration-300",
                isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
            )}>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.displayName || 'Usuario'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                </span>
            </div>
        </div>
      </div>
    </aside>
  );
}
