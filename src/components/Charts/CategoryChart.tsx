'use client';

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useWallet } from '@/context/WalletContext';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryChart() {
  const { currentWallet, selectedMonth, selectedYear } = useWallet();

  const data = useMemo(() => {
    if (!currentWallet) return { labels: [], datasets: [] };

    const monthlyTransactions = currentWallet.transactions.filter(t => {
      const [year, month] = t.date.split('-').map(Number);
      return month - 1 === selectedMonth && year === selectedYear && (t.type === 'expense_debit' || t.type === 'expense_credit');
    });

    const categoryTotals: { [key: string]: number } = {};
    monthlyTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#E7E9ED', '#76A346', '#808000', '#008080', '#000080', '#800080'
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [currentWallet, selectedMonth, selectedYear]);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">Gastos por Categoría</h3>
      <div className="h-64 flex justify-center">
        {data.labels.length > 0 ? (
          <Doughnut data={data} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'white' } } } }} />
        ) : (
          <p className="text-gray-400 self-center">No hay gastos registrados este mes.</p>
        )}
      </div>
    </div>
  );
}
