'use client';

import React, { useMemo } from 'react';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { FaArrowUp, FaArrowDown, FaWallet } from 'react-icons/fa';
import CategoryChart from './Charts/CategoryChart';

export default function Dashboard() {
  const { currentWallet, selectedMonth, selectedYear } = useWallet();

  const stats = useMemo(() => {
    if (!currentWallet) return { income: 0, expenses: 0, balance: 0 };

    const monthlyTransactions = currentWallet.transactions.filter(t => {
      const [year, month] = t.date.split('-').map(Number);
      return month - 1 === selectedMonth && year === selectedYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense_debit' || t.type === 'expense_credit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [currentWallet, selectedMonth, selectedYear]);

  if (!currentWallet) return <div>No wallet selected</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-lg shadow-lg border-l-4 border-brand-accent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Ingresos Totales</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(stats.income)}</h3>
            </div>
            <div className="bg-brand-accent/20 p-3 rounded-full">
              <FaArrowUp className="text-brand-accent text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg shadow-lg border-l-4 border-brand-secondary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Gastos Totales</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(stats.expenses)}</h3>
            </div>
            <div className="bg-brand-secondary/20 p-3 rounded-full">
              <FaArrowDown className="text-brand-secondary text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg shadow-lg border-l-4 border-brand-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Balance Mensual</p>
              <h3 className={`text-2xl font-bold mt-1 ${stats.balance >= 0 ? 'text-brand-accent' : 'text-brand-secondary'}`}>
                {formatCurrency(stats.balance)}
              </h3>
            </div>
            <div className="bg-brand-primary/20 p-3 rounded-full">
              <FaWallet className="text-brand-primary text-xl" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart />
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-text-primary mb-4">Resumen de Presupuestos</h3>
            <p className="text-text-secondary">Próximamente...</p>
        </div>
      </div>
    </div>
  );
}
