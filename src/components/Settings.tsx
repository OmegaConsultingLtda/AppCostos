'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';

export default function Settings() {
  const { appState, setAppState, saveData, currentWallet, selectedMonth, selectedYear } = useWallet();
  const [geminiKey, setGeminiKey] = useState(appState.geminiApiKey || '');
  const [usdRate, setUsdRate] = useState(String(appState.exchangeRates.USD || ''));
  const [ufRate, setUfRate] = useState(String(appState.exchangeRates.UF || ''));
  const [bankDebit, setBankDebit] = useState('');
  const [bankCredit, setBankCredit] = useState('');
  const [manualSurplus, setManualSurplus] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setGeminiKey(appState.geminiApiKey || '');
    setUsdRate(String(appState.exchangeRates.USD || ''));
    setUfRate(String(appState.exchangeRates.UF || ''));
  }, [appState.geminiApiKey, appState.exchangeRates]);

  useEffect(() => {
    if (!currentWallet) return;
    setBankDebit(currentWallet.bankDebitBalance ? String(currentWallet.bankDebitBalance) : '');
    setBankCredit(currentWallet.bankCreditBalance ? String(currentWallet.bankCreditBalance) : '');
    const surplusKey = `${selectedYear}-${selectedMonth}`;
    setManualSurplus(currentWallet.manualSurplus?.[surplusKey] ? String(currentWallet.manualSurplus[surplusKey]) : '');
  }, [currentWallet, selectedMonth, selectedYear]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateAppState = (newState: typeof appState) => {
    setAppState(newState);
    void saveData(newState);
  };

  const handleSaveGeneral = () => {
    updateAppState({
      ...appState,
      geminiApiKey: geminiKey.trim(),
      exchangeRates: {
        ...appState.exchangeRates,
        USD: Number(usdRate) || 0,
        UF: Number(ufRate) || 0,
        lastUpdated: new Date().toISOString()
      }
    });
  };

  const handleWalletSettingsSave = () => {
    if (!currentWallet) return;
    const updatedWallets = appState.wallets.map(wallet => {
      if (wallet.id !== currentWallet.id) return wallet;
      const surplusKey = `${selectedYear}-${selectedMonth}`;
      const manualSurplusMap = { ...(wallet.manualSurplus || {}) };
      manualSurplusMap[surplusKey] = Number(manualSurplus) || 0;
      return {
        ...wallet,
        bankDebitBalance: Number(bankDebit) || 0,
        bankCreditBalance: Number(bankCredit) || 0,
        manualSurplus: manualSurplusMap
      };
    });
    updateAppState({ ...appState, wallets: updatedWallets });
  };

  const debitDifference = useMemo(() => {
    if (!currentWallet) return 0;
    const [year, month] = [selectedYear, selectedMonth];
    const monthlyIncome = currentWallet.transactions
      .filter(tx => {
        const [y, m] = tx.date.split('-').map(Number);
        return y === year && m - 1 === month && tx.type === 'income';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const monthlyDebitExpenses = currentWallet.transactions
      .filter(tx => {
        const [y, m] = tx.date.split('-').map(Number);
        return y === year && m - 1 === month && tx.type === 'expense_debit';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const key = `${year}-${month}`;
    const surplus = currentWallet.manualSurplus?.[key] || 0;
    const appBalance = monthlyIncome - monthlyDebitExpenses + surplus;
    return appBalance - (currentWallet.bankDebitBalance || 0);
  }, [currentWallet, selectedMonth, selectedYear]);

  if (!currentWallet) {
    return <div className="text-gray-400">Selecciona una billetera para configurar.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
        <header className="mb-4">
          <p className="text-sm uppercase tracking-widest text-indigo-400">Integraciones</p>
          <h2 className="text-2xl font-semibold text-white">Configuración General</h2>
          <p className="text-sm text-gray-400">Actualiza tus credenciales y tasas de referencia.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Gemini API Key</label>
            <textarea
              className="h-32 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Ingresa tu clave privada"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Tipo Cambio USD</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">UF</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                value={ufRate}
                onChange={(e) => setUfRate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <button
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
          onClick={handleSaveGeneral}
        >
          Guardar configuración
        </button>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
        <header className="mb-4">
          <p className="text-sm uppercase tracking-widest text-indigo-400">Conciliación</p>
          <h2 className="text-2xl font-semibold text-white">Balances Bancarios</h2>
          <p className="text-sm text-gray-400">Registra los saldos oficiales para compararlos con el flujo registrado en la app.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Saldo Banco (Débito)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              value={bankDebit}
              onChange={(e) => setBankDebit(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Saldo Banco (Crédito)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              value={bankCredit}
              onChange={(e) => setBankCredit(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Superávit Mes Anterior</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              value={manualSurplus}
              onChange={(e) => setManualSurplus(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div>
            <p className="text-sm text-gray-400">Diferencia calculada por la app</p>
            <p className={debitDifference >= 0 ? 'text-lg font-semibold text-green-400' : 'text-lg font-semibold text-red-400'}>
              {formatCurrency(debitDifference)}
            </p>
          </div>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-500"
            onClick={handleWalletSettingsSave}
          >
            Guardar balances
          </button>
        </div>
      </section>
    </div>
  );
}

