'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types';

interface CreditCardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditCardPaymentModal({ isOpen, onClose }: CreditCardPaymentModalProps) {
  const { currentWallet, appState, setAppState, saveData, selectedMonth, selectedYear } = useWallet();
  const [selectedCardId, setSelectedCardId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [installmentPayments, setInstallmentPayments] = useState<{ [installmentId: number]: number | string }>({});

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen && currentWallet) {
      setSelectedCardId(currentWallet.creditCards?.[0]?.id || '');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('Pago de Tarjeta de Crédito');
      setInstallmentPayments({});
    }
  }, [isOpen, currentWallet]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    if (!currentWallet || !selectedCardId || !amount) return;

    const totalAmount = Number(amount) || 0;
    const installmentTotal = Object.values(installmentPayments).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
    const spotPayment = totalAmount - installmentTotal;

    const periodKey = `${selectedYear}-${selectedMonth}`;
    const newTransaction: Transaction = {
      id: Date.now(),
      description: description || 'Pago de Tarjeta de Crédito',
      amount: totalAmount,
      date,
      type: 'expense_debit',
      category: '[Pago de Deuda]',
      subcategory: null,
      cardId: Number(selectedCardId)
    };

    const updatedWallets = appState.wallets.map(w => {
      if (w.id !== currentWallet.id) return w;

      const transactions = [...w.transactions];
      transactions.push(newTransaction);

      const installments = [...(w.installments || [])];
      const paidInstallmentIds: number[] = [];

      Object.entries(installmentPayments).forEach(([instId, instAmount]) => {
        const installmentId = Number(instId);
        const paymentAmount = Number(instAmount) || 0;
        if (paymentAmount <= 0) return;

        const installment = installments.find(i => i.id === installmentId);
        if (!installment) return;

        const installmentIndex = installments.findIndex(i => i.id === installmentId);
        const updated = { ...installments[installmentIndex] };
        updated.paymentHistory = { ...(updated.paymentHistory || {}) };
        updated.paymentHistory[periodKey] = {
          amount: paymentAmount,
          paid: true,
          transactionId: newTransaction.id
        };
        updated.paidInstallments = (updated.paidInstallments || 0) + 1;
        installments[installmentIndex] = updated;
        paidInstallmentIds.push(installmentId);
      });

      if (spotPayment > 0) {
        newTransaction.installmentPaymentPortion = installmentTotal;
      }

      if (paidInstallmentIds.length > 0) {
        newTransaction.paidInstallmentIds = paidInstallmentIds;
      }

      return { ...w, transactions, installments };
    });

    const newState = { ...appState, wallets: updatedWallets };
    setAppState(newState);
    await saveData(newState);
    onClose();
  };

  if (!currentWallet) return null;

  const availableInstallments = (currentWallet.installments || []).filter(inst => {
    if (inst.type !== 'credit_card') return false;
    if (inst.cardId !== Number(selectedCardId)) return false;
    const periodKey = `${selectedYear}-${selectedMonth}`;
    return !inst.paymentHistory?.[periodKey];
  });

  const totalInstallmentPayments = Object.values(installmentPayments).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
  const remainingForSpot = Number(amount) - totalInstallmentPayments;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pago de EE.CC">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tarjeta</label>
          <select
            required
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
            value={selectedCardId}
            onChange={e => {
              setSelectedCardId(Number(e.target.value));
              setInstallmentPayments({});
            }}
          >
            <option value="">Seleccionar Tarjeta</option>
            {currentWallet.creditCards?.map(card => (
              <option key={card.id} value={card.id}>{card.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
          <input
            type="text"
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Pago de Tarjeta de Crédito"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Monto Total</label>
            <input
              type="number"
              required
              min="0"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
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

        {availableInstallments.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">Asignar a Cuotas (Opcional)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableInstallments.map(inst => {
                const monthlyPayment = inst.totalInstallments > 0 ? inst.totalAmount / inst.totalInstallments : 0;
                return (
                  <div key={inst.id} className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded">
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{inst.description}</p>
                      <p className="text-xs text-text-secondary">Cuota: {formatCurrency(monthlyPayment)}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={monthlyPayment}
                      step="0.01"
                      className="w-24 bg-surface border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-1 text-sm text-right"
                      value={installmentPayments[inst.id] || ''}
                      onChange={e => setInstallmentPayments({
                        ...installmentPayments,
                        [inst.id]: e.target.value
                      })}
                      placeholder="0"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-text-secondary">
              Total asignado a cuotas: {formatCurrency(totalInstallmentPayments)}
              {remainingForSpot > 0 && (
                <span className="block mt-1">Restante para pago spot: {formatCurrency(remainingForSpot)}</span>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4"
        >
          Registrar Pago
        </button>
      </form>
    </Modal>
  );
}
// --- FIN DEL ARCHIVO ---