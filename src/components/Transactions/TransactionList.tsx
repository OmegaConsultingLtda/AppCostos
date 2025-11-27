'use client';

import React, { useState, useMemo } from 'react';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency, formatYmdToDmy } from '@/utils/format';
import { FaArrowDown, FaWallet, FaCreditCard, FaSort, FaSortUp, FaSortDown, FaPlus } from 'react-icons/fa';
import clsx from 'clsx';
import TransactionModal from '../Modals/TransactionModal';
import { Transaction } from '@/types';

export default function TransactionList() {
  const { currentWallet, selectedMonth, selectedYear, appState, setAppState, saveData } = useWallet();
  const [sortColumn, setSortColumn] = useState<'date' | 'amount' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const transactions = useMemo(() => {
    if (!currentWallet) return [];

    let filtered = currentWallet.transactions.filter(t => {
      const [year, month] = t.date.split('-').map(Number);
      return month - 1 === selectedMonth && year === selectedYear;
    });

    return filtered.sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (sortColumn === 'amount') {
         valA = a.type === 'income' ? a.amount : -a.amount;
         valB = b.type === 'income' ? b.amount : -b.amount;
      }

      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      return 0;
    });
  }, [currentWallet, selectedMonth, selectedYear, sortColumn, sortDirection]);

  const handleDelete = async (id: number) => {
    if (!currentWallet || !confirm('¿Estás seguro de eliminar este movimiento?')) return;

    const updatedWallets = appState.wallets.map(w => {
      if (w.id === currentWallet.id) {
        return { ...w, transactions: w.transactions.filter(t => t.id !== id) };
      }
      return w;
    });

    const newState = { ...appState, wallets: updatedWallets };
    setAppState(newState);
    await saveData(newState);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSort = (column: 'date' | 'amount' | 'category') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to desc for new column
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <FaSort className="text-gray-400" />;
    return sortDirection === 'asc' ? <FaSortUp className="text-white" /> : <FaSortDown className="text-white" />;
  };

  const getTypeBadge = (tx: any) => {
      if (tx.type === 'income') return <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-blue-500 text-white"><FaArrowDown /> Ingreso</span>;
      if (tx.type === 'expense_debit') return <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-orange-500 text-white"><FaWallet /> Gasto (Débito)</span>;
      if (tx.type === 'expense_credit') {
          const cardName = currentWallet?.creditCards?.find(c => c.id === tx.cardId)?.name || 'Crédito';
          return <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-purple-600 text-white"><FaCreditCard /> {cardName}</span>;
      }
      return null;
  };

  if (!currentWallet) return <div>No wallet selected</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Movimientos</h2>
        <button 
          onClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <FaPlus /> Nuevo Movimiento
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700 text-gray-300 text-sm uppercase tracking-wider">
                <th className="p-3 font-semibold">Descripción</th>
                <th className="p-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">Fecha {getSortIcon('date')}</div>
                </th>
                <th className="p-3 font-semibold hidden sm:table-cell cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                   <div className="flex items-center gap-1">Categoría {getSortIcon('category')}</div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-white text-right" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">Monto {getSortIcon('amount')}</div>
                </th>
                <th className="p-3 font-semibold text-center">Tipo</th>
                <th className="p-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.length > 0 ? (
                transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="p-3 font-medium text-white">{tx.description}</td>
                    <td className="p-3 text-sm text-gray-300">{formatYmdToDmy(tx.date)}</td>
                    <td className="p-3 hidden sm:table-cell text-gray-300">
                      {tx.category}
                      {tx.subcategory && <span className="block text-xs text-gray-500">{tx.subcategory}</span>}
                    </td>
                    <td className={clsx("p-3 text-right font-bold", tx.type === 'income' ? 'text-green-400' : 'text-red-400')}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="p-3 text-center">
                      {getTypeBadge(tx)}
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleEdit(tx)}
                        className="text-blue-400 hover:text-blue-300 mr-2"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No hay movimientos en este período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        transactionToEdit={editingTransaction} 
      />
    </div>
  );
}
