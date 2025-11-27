'use client';

import { useState } from 'react';
import { useWallet } from "@/context/WalletContext";
import AuthScreen from "@/components/AuthScreen";
import Dashboard from "@/components/Dashboard";
import TransactionList from "@/components/Transactions/TransactionList";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const { user, loading } = useWallet();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Cargando...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="flex flex-col md:flex-row gap-8">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <main className="flex-1 min-w-0">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'transactions' && <TransactionList />}
            {activeTab === 'debts' && <div className="text-white">Debts Content</div>}
            {activeTab === 'budgets' && <div className="text-white">Budgets Content</div>}
            {activeTab === 'investments' && <div className="text-white">Investments Content</div>}
            {activeTab === 'settings' && <div className="text-white">Settings Content</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
