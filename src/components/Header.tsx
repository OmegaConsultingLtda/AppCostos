'use client';

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FaSignOutAlt } from 'react-icons/fa';

export default function Header() {
  const { 
    appState, 
    setAppState, 
    selectedMonth, 
    setSelectedMonth, 
    selectedYear, 
    setSelectedYear 
  } = useWallet();

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleWalletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAppState(prev => ({ ...prev, currentWalletId: Number(e.target.value) }));
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="w-full md:w-auto text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Panel de Control Financiero</h1>
        <p className="text-text-secondary">Herramienta de análisis y optimización para tus finanzas.</p>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4 bg-surface p-3 rounded-lg w-full md:w-auto shadow-md">
        <div className="flex items-center gap-2">
          <label htmlFor="walletSelector" className="text-sm font-medium text-text-secondary">Billetera:</label>
          <select 
            id="walletSelector" 
            className="bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 text-sm focus:outline-none focus:border-brand-accent"
            value={appState.currentWalletId}
            onChange={handleWalletChange}
          >
            {appState.wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block border-l border-gray-200 dark:border-gray-700 h-6"></div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="monthSelector" className="text-sm font-medium text-text-secondary">Período:</label>
          <select 
            id="monthSelector" 
            className="bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 text-sm focus:outline-none focus:border-brand-accent"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select 
            id="yearSelector" 
            className="bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 text-sm focus:outline-none focus:border-brand-accent"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block border-l border-gray-200 dark:border-gray-700 h-6"></div>
        
        <button 
          onClick={handleLogout}
          className="bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <FaSignOutAlt />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
