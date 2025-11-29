'use client';

import React, { useState, useMemo } from 'react';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { FaEdit, FaTrash, FaPlus, FaLock } from 'react-icons/fa';
import { Installment, Wallet } from '@/types';
import Modal from './Modals/Modal';

export default function Installments() {
  const { currentWallet, appState, setAppState, saveData, selectedMonth, selectedYear } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    totalAmount: '',
    totalInstallments: '',
    type: 'credit_card' as 'credit_card' | 'consumer_loan',
    cardId: undefined as number | undefined
  });

  const installments = useMemo(() => {
    if (!currentWallet) return [];
    return currentWallet.installments || [];
  }, [currentWallet]);

  const updateWallet = (updater: (wallet: Wallet) => Wallet) => {
    if (!currentWallet) return;
    const updatedWallets = appState.wallets.map(w => {
      if (w.id === currentWallet.id) {
        return updater({ ...w }) || w;
      }
      return w;
    });
    const newState = { ...appState, wallets: updatedWallets };
    setAppState(newState);
    void saveData(newState);
  };

  const handleOpenModal = (installment?: Installment) => {
    if (installment) {
      setEditingInstallment(installment);
      setFormData({
        description: installment.description,
        totalAmount: String(installment.totalAmount),
        totalInstallments: String(installment.totalInstallments),
        type: installment.type,
        cardId: installment.cardId
      });
    } else {
      setEditingInstallment(null);
      setFormData({
        description: '',
        totalAmount: '',
        totalInstallments: '',
        type: 'credit_card',
        cardId: undefined
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentWallet) return;
    const installment: Installment = {
      id: editingInstallment?.id || Date.now(),
      description: formData.description,
      totalAmount: Number(formData.totalAmount) || 0,
      totalInstallments: Number(formData.totalInstallments) || 0,
      type: formData.type,
      cardId: formData.type === 'credit_card' ? formData.cardId : undefined
    };

    updateWallet(wallet => {
      const installments = [...(wallet.installments || [])];
      if (editingInstallment) {
        const index = installments.findIndex(i => i.id === editingInstallment.id);
        if (index >= 0) {
          installments[index] = installment;
        }
      } else {
        installments.push(installment);
      }
      return { ...wallet, installments };
    });

    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta cuota?')) return;
    updateWallet(wallet => ({
      ...wallet,
      installments: (wallet.installments || []).filter(i => i.id !== id)
    }));
  };

  const handleTogglePaid = (installment: Installment) => {
    if (!currentWallet) return;
    const periodKey = `${selectedYear}-${selectedMonth}`;
    const paymentHistory = installment.paymentHistory || {};
    const isPaid = !!paymentHistory[periodKey];
    const isLocked = paymentHistory[periodKey]?.transactionId ? true : false;

    if (isLocked) return; // Can't toggle if locked by transaction

    updateWallet(wallet => {
      const installments = [...(wallet.installments || [])];
      const index = installments.findIndex(i => i.id === installment.id);
      if (index < 0) return wallet;

      const updated = { ...installments[index] };
      updated.paymentHistory = { ...paymentHistory };

      if (isPaid) {
        delete updated.paymentHistory[periodKey];
        updated.paidInstallments = Math.max(0, (updated.paidInstallments || 0) - 1);
      } else {
        updated.paymentHistory[periodKey] = {
          amount: updated.totalInstallments > 0 ? updated.totalAmount / updated.totalInstallments : 0,
          paid: true
        };
        updated.paidInstallments = (updated.paidInstallments || 0) + 1;
      }

      installments[index] = updated;
      return { ...wallet, installments };
    });
  };

  if (!currentWallet) {
    return <div className="text-gray-400">Selecciona una billetera para ver las cuotas.</div>;
  }

  const totals = useMemo(() => {
    return installments.reduce((acc, item) => {
      const monthly = item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0;
      const remaining = monthly * (item.totalInstallments - (item.paidInstallments || 0));
      acc.monthly += monthly;
      acc.remaining += remaining;
      return acc;
    }, { monthly: 0, remaining: 0 });
  }, [installments]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">Cuotas y Créditos</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <FaPlus /> Nueva Cuota
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background text-text-secondary text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                <th className="p-3 font-semibold">Descripción</th>
                <th className="p-3 font-semibold text-right">Cuota Mensual</th>
                <th className="p-3 font-semibold text-center">Pagadas</th>
                <th className="p-3 font-semibold text-right hidden sm:table-cell">Saldo Pendiente</th>
                <th className="p-3 font-semibold text-center">Este Mes</th>
                <th className="p-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {installments.length > 0 ? (
                installments.map(item => {
                  const monthlyPayment = item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0;
                  const remainingBalance = monthlyPayment * (item.totalInstallments - (item.paidInstallments || 0));
                  const isPaidOff = (item.paidInstallments || 0) >= item.totalInstallments;
                  const periodKey = `${selectedYear}-${selectedMonth}`;
                  const paymentRecord = item.paymentHistory?.[periodKey];
                  const isPaidThisMonth = !!paymentRecord;
                  const isLocked = paymentRecord?.transactionId ? true : false;

                  return (
                    <tr key={item.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-3 font-medium text-text-primary">{item.description}</td>
                      <td className="p-3 text-right text-brand-accent font-semibold">{formatCurrency(monthlyPayment)}</td>
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${isPaidOff ? 'text-brand-primary' : 'text-text-primary'}`}>
                          {item.paidInstallments || 0}
                        </span>
                        <span className="text-text-secondary"> / {item.totalInstallments}</span>
                      </td>
                      <td className={`p-3 text-right font-bold hidden sm:table-cell ${isPaidOff ? 'text-text-secondary' : 'text-brand-secondary'}`}>
                        {formatCurrency(remainingBalance)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={isPaidThisMonth}
                            onChange={() => handleTogglePaid(item)}
                            disabled={isLocked}
                            className="w-5 h-5 text-brand-accent bg-background border-gray-200 dark:border-gray-500 rounded focus:ring-brand-accent focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {isLocked && <FaLock className="text-xs text-text-secondary" title="Pagado vía transacción" />}
                        </div>
                      </td>
                      <td className="p-3 text-center space-x-1">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="text-brand-primary hover:text-brand-primary/80"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-brand-secondary hover:text-brand-secondary/80"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary">No hay cuotas registradas.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-background text-text-primary text-sm font-bold border-t border-gray-200 dark:border-gray-800">
                <td className="p-3">Totales</td>
                <td className="p-3 text-right text-brand-accent">{formatCurrency(totals.monthly)}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-brand-secondary hidden sm:table-cell">{formatCurrency(totals.remaining)}</td>
                <td className="p-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInstallment ? 'Editar Cuota' : 'Nueva Cuota'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Descripción</label>
            <input
              type="text"
              required
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Monto Total</label>
              <input
                type="number"
                required
                min="0"
                className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
                value={formData.totalAmount}
                onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Número de Cuotas</label>
              <input
                type="number"
                required
                min="1"
                className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
                value={formData.totalInstallments}
                onChange={e => setFormData({ ...formData, totalInstallments: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
            <select
              className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as 'credit_card' | 'consumer_loan', cardId: undefined })}
            >
              <option value="credit_card">Tarjeta de Crédito</option>
              <option value="consumer_loan">Crédito de Consumo</option>
            </select>
          </div>

          {formData.type === 'credit_card' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tarjeta</label>
              <select
                required
                className="w-full bg-background border border-gray-200 dark:border-gray-700 text-text-primary rounded-lg p-2 focus:outline-none focus:border-brand-accent"
                value={formData.cardId || ''}
                onChange={e => setFormData({ ...formData, cardId: Number(e.target.value) })}
              >
                <option value="">Seleccionar Tarjeta</option>
                {currentWallet?.creditCards.map(card => (
                  <option key={card.id} value={card.id}>{card.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4"
          >
            {editingInstallment ? 'Guardar Cambios' : 'Agregar Cuota'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

