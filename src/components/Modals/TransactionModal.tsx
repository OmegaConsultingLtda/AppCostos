'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useWallet } from '@/context/WalletContext';
import { Transaction } from '@/types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export default function TransactionModal({ isOpen, onClose, transactionToEdit }: TransactionModalProps) {
  const { currentWallet, appState, setAppState, saveData } = useWallet();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  type TransactionType = 'income' | 'expense_debit' | 'expense_credit';
  const [type, setType] = useState<TransactionType>('expense_debit');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [cardId, setCardId] = useState<number | undefined>(undefined);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (transactionToEdit) {
      setDescription(transactionToEdit.description);
      setAmount(transactionToEdit.amount.toString());
      setDate(transactionToEdit.date);
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
      setSubcategory(transactionToEdit.subcategory || '');
      setCardId(transactionToEdit.cardId);
    } else {
      // Reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setType('expense_debit');
      setCategory('');
      setSubcategory('');
      setCardId(undefined);
    }
  }, [transactionToEdit, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWallet) return;

    const newTransaction: Transaction = {
      id: transactionToEdit ? transactionToEdit.id : Date.now(),
      description,
      amount: Number(amount),
      date,
      type,
      category,
      subcategory: subcategory || null,
      cardId: type === 'expense_credit' ? Number(cardId) : undefined,
    };

    const updatedWallets = appState.wallets.map(w => {
      if (w.id === currentWallet.id) {
        let updatedTransactions = [...w.transactions];
        if (transactionToEdit) {
          updatedTransactions = updatedTransactions.map(t => t.id === transactionToEdit.id ? newTransaction : t);
        } else {
          updatedTransactions.push(newTransaction);
        }
        return { ...w, transactions: updatedTransactions };
      }
      return w;
    });

    const newState = { ...appState, wallets: updatedWallets };
    setAppState(newState);
    await saveData(newState);
    onClose();
  };

  const categories = currentWallet?.transactionCategories || {};
  const categoryList = Object.keys(categories);
  const subcategoryList = category ? categories[category] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transactionToEdit ? 'Editar Movimiento' : 'Nuevo Movimiento'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
          <input
            type="text"
            required
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Monto</label>
            <input
              type="number"
              required
              min="0"
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Fecha</label>
            <input
              type="date"
              required
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
          <select
            className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
            value={type}
            onChange={e => setType(e.target.value as TransactionType)}
          >
            <option value="income">Ingreso</option>
            <option value="expense_debit">Gasto (Débito)</option>
            <option value="expense_credit">Gasto (Crédito)</option>
          </select>
        </div>

        {type === 'expense_credit' && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Tarjeta de Crédito</label>
            <select
              required
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={cardId || ''}
              onChange={e => setCardId(Number(e.target.value))}
            >
              <option value="">Seleccionar Tarjeta</option>
              {currentWallet?.creditCards.map(card => (
                <option key={card.id} value={card.id}>{card.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Categoría</label>
            <select
              required
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                setSubcategory('');
              }}
            >
              <option value="">Seleccionar</option>
              {categoryList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Subcategoría</label>
            <select
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={subcategory}
              onChange={e => setSubcategory(e.target.value)}
              disabled={!category || subcategoryList.length === 0}
            >
              <option value="">{subcategoryList.length === 0 ? '-' : 'Seleccionar'}</option>
              {subcategoryList.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4"
        >
          {transactionToEdit ? 'Guardar Cambios' : 'Agregar Movimiento'}
        </button>
      </form>
    </Modal>
  );
}
