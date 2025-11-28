'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { FaEdit, FaTrash, FaPlus, FaWallet } from 'react-icons/fa';
import Modal from './Modals/Modal';
import { Wallet, CreditCard } from '@/types';

export default function WalletConfig() {
  const { appState, setAppState, saveData, currentWallet } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [walletFormData, setWalletFormData] = useState({ name: '' });
  const [cardFormData, setCardFormData] = useState({ name: '', limit: '' });

  const updateAppState = (updater: (state: typeof appState) => typeof appState) => {
    const newState = updater(appState);
    setAppState(newState);
    void saveData(newState);
  };

  const handleAddWallet = () => {
    setEditingWallet(null);
    setWalletFormData({ name: '' });
    setIsWalletModalOpen(true);
  };

  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setWalletFormData({ name: wallet.name });
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = () => {
    if (!walletFormData.name.trim()) return;

    updateAppState(state => {
      const wallets = [...state.wallets];
      if (editingWallet) {
        const index = wallets.findIndex(w => w.id === editingWallet.id);
        if (index >= 0) {
          wallets[index] = { ...wallets[index], name: walletFormData.name };
        }
      } else {
        const newId = Math.max(...wallets.map(w => w.id), 0) + 1;
        wallets.push({
          id: newId,
          name: walletFormData.name,
          transactions: [],
          previousMonthTransactions: [],
          fixedIncomes: [],
          installments: [],
          creditCards: [],
          transactionCategories: {
            'Ingresos': [],
            '[Pago de Deuda]': [],
            'Cuentas': ['Luz', 'Agua', 'Gas', 'Internet', 'Celular'],
            'Compras': ['Supermercado', 'Farmacia', 'Ropa'],
            'Transporte': ['Bencina', 'Transporte Público'],
            'Restaurante': ['Almuerzo', 'Cena', 'Delivery'],
            'Ocio': [],
            'Otros': []
          },
          budgets: {},
          creditCardLimit: 0,
          bankDebitBalance: 0,
          bankCreditBalance: 0,
          manualSurplus: {}
        });
      }
      return { ...state, wallets };
    });

    setIsWalletModalOpen(false);
  };

  const handleDeleteWallet = (id: number) => {
    if (appState.wallets.length <= 1) {
      alert('No puedes eliminar la última billetera.');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar esta billetera? Esta acción no se puede deshacer.')) return;

    updateAppState(state => {
      const wallets = state.wallets.filter(w => w.id !== id);
      const currentWalletId = state.currentWalletId === id
        ? wallets[0]?.id || 1
        : state.currentWalletId;
      return { ...state, wallets, currentWalletId };
    });
  };

  const handleAddCard = () => {
    if (!currentWallet) return;
    setEditingCard(null);
    setCardFormData({ name: '', limit: '' });
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setCardFormData({ name: card.name, limit: String(card.limit) });
    setIsCardModalOpen(true);
  };

  const handleSaveCard = () => {
    if (!currentWallet || !cardFormData.name.trim()) return;

    updateAppState(state => {
      const wallets = state.wallets.map(w => {
        if (w.id !== currentWallet.id) return w;
        const cards = [...(w.creditCards || [])];
        if (editingCard) {
          const index = cards.findIndex(c => c.id === editingCard.id);
          if (index >= 0) {
            cards[index] = { ...cards[index], name: cardFormData.name, limit: Number(cardFormData.limit) || 0 };
          }
        } else {
          const newId = Math.max(...cards.map(c => c.id), 0) + 1;
          cards.push({
            id: newId,
            name: cardFormData.name,
            limit: Number(cardFormData.limit) || 0,
            bankAvailable: 0
          });
        }
        return { ...w, creditCards: cards };
      });
      return { ...state, wallets };
    });

    setIsCardModalOpen(false);
  };

  const handleDeleteCard = (id: number) => {
    if (!currentWallet || !confirm('¿Estás seguro de eliminar esta tarjeta?')) return;

    updateAppState(state => {
      const wallets = state.wallets.map(w => {
        if (w.id !== currentWallet.id) return w;
        return { ...w, creditCards: (w.creditCards || []).filter(c => c.id !== id) };
      });
      return { ...state, wallets };
    });
  };

  if (!currentWallet) {
    return <div className="text-gray-400">Selecciona una billetera para configurar.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Billeteras</h2>
          <button
            onClick={handleAddWallet}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <FaPlus /> Nueva Billetera
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700 text-gray-300 text-sm uppercase tracking-wider">
                  <th className="p-3 font-semibold">Nombre</th>
                  <th className="p-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {appState.wallets.map(wallet => (
                  <tr key={wallet.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="p-3 font-medium text-white flex items-center gap-2">
                      <FaWallet className="text-indigo-400" />
                      {wallet.name}
                      {wallet.id === appState.currentWalletId && (
                        <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">Activa</span>
                      )}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => handleEditWallet(wallet)}
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        <FaEdit />
                      </button>
                      {appState.wallets.length > 1 && (
                        <button
                          onClick={() => handleDeleteWallet(wallet.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Tarjetas de Crédito</h2>
          <button
            onClick={handleAddCard}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <FaPlus /> Nueva Tarjeta
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700 text-gray-300 text-sm uppercase tracking-wider">
                  <th className="p-3 font-semibold">Nombre</th>
                  <th className="p-3 font-semibold text-right">Límite</th>
                  <th className="p-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentWallet.creditCards && currentWallet.creditCards.length > 0 ? (
                  currentWallet.creditCards.map(card => (
                    <tr key={card.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="p-3 font-medium text-white">{card.name}</td>
                      <td className="p-3 text-right text-gray-300">{formatCurrency(card.limit)}</td>
                      <td className="p-3 text-center space-x-2">
                        <button
                          onClick={() => handleEditCard(card)}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">No hay tarjetas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title={editingWallet ? 'Editar Billetera' : 'Nueva Billetera'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveWallet(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              required
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
              value={walletFormData.name}
              onChange={e => setWalletFormData({ name: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4"
          >
            {editingWallet ? 'Guardar Cambios' : 'Crear Billetera'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveCard(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              required
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
              value={cardFormData.name}
              onChange={e => setCardFormData({ ...cardFormData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Límite</label>
            <input
              type="number"
              required
              min="0"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
              value={cardFormData.limit}
              onChange={e => setCardFormData({ ...cardFormData, limit: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4"
          >
            {editingCard ? 'Guardar Cambios' : 'Agregar Tarjeta'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

