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
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="flex flex-col md:flex-row gap-8">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <main className="flex-1 min-w-0">
            {activeTab === 'dashboard' && (
              <>
                <Dashboard />
                {isQAEnvironment() && (
                  <div className="mt-6">
                    <QATools />
                  </div>
                )}
              </>
            )}
            {activeTab === 'transactions' && <TransactionList />}
            {activeTab === 'debts' && <Installments />}
            {activeTab === 'budgets' && <Budgets />}
            {activeTab === 'investments' && <div className="text-white">Investments Content</div>}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <Settings />
                <WalletConfig />
                {isQAEnvironment() && <QATools />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
