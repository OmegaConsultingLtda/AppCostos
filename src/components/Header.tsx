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
        <h1 className="text-2xl md:text-3xl font-bold text-white">Panel de Control Financiero</h1>
        <p className="text-gray-400">Herramienta de análisis y optimización para tus finanzas.</p>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4 bg-gray-800 p-3 rounded-lg w-full md:w-auto shadow-md">
        <div className="flex items-center gap-2">
          <label htmlFor="walletSelector" className="text-sm font-medium text-gray-300">Billetera:</label>
          <select 
            id="walletSelector" 
            className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500"
            value={appState.currentWalletId}
            onChange={handleWalletChange}
          >
            {appState.wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block border-l border-gray-600 h-6"></div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="monthSelector" className="text-sm font-medium text-gray-300">Período:</label>
          <select 
            id="monthSelector" 
            className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select 
            id="yearSelector" 
            className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block border-l border-gray-600 h-6"></div>
        
        <button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <FaSignOutAlt />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
