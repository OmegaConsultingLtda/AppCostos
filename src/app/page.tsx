'use client';

import { useState } from 'react';
import { useWallet } from "@/context/WalletContext";
import AuthScreen from "@/components/AuthScreen";
import Dashboard from "@/components/Dashboard";
import TransactionList from "@/components/Transactions/TransactionList";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Budgets from "@/components/Budgets";
import Settings from "@/components/Settings";
import Installments from "@/components/Installments";
import WalletConfig from "@/components/WalletConfig";
import QATools from "@/components/QATools";
import { isQAEnvironment } from "@/utils/env";

export default function Home() {
  const { user, loading } = useWallet();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-text-primary">Cargando...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {isQAEnvironment() && (
        <div className="w-full bg-red-600 text-white text-center font-bold py-1 px-4 text-sm">
          Ambiente QA
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
        
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Header />
            
            <main className="mt-4">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'transactions' && <TransactionList />}
              {activeTab === 'debts' && <Installments />}
              {activeTab === 'budgets' && <Budgets />}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <Settings />
                  <WalletConfig />
                </div>
              )}
              {activeTab === 'qa-tools' && isQAEnvironment() && <QATools />}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
