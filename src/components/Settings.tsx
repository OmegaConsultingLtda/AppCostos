'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';

export default function Settings() {
  const { theme, setTheme } = useTheme();
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
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface p-6 shadow-sm">
        <header className="mb-4">
          <p className="text-sm uppercase tracking-widest text-brand-accent">Integraciones</p>
          <h2 className="text-2xl font-semibold text-text-primary">Configuración General</h2>
          <p className="text-sm text-text-secondary">Actualiza tus credenciales y tasas de referencia.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Gemini API Key</label>
            <textarea
              className="h-32 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Ingresa tu clave privada"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Tipo Cambio USD</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">UF</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                value={ufRate}
                onChange={(e) => setUfRate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <button
          className="mt-4 rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white transition hover:bg-brand-primary/90"
          onClick={handleSaveGeneral}
        >
          Guardar configuración
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface p-6 shadow-sm">
        <header className="mb-4">
          <p className="text-sm uppercase tracking-widest text-brand-accent">Conciliación</p>
          <h2 className="text-2xl font-semibold text-text-primary">Balances Bancarios</h2>
          <p className="text-sm text-text-secondary">Registra los saldos oficiales para compararlos con el flujo registrado en la app.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Saldo Banco (Débito)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
              value={bankDebit}
              onChange={(e) => setBankDebit(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Saldo Banco (Crédito)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
              value={bankCredit}
              onChange={(e) => setBankCredit(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Superávit Mes Anterior</label>
            <input
              type="number"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
              value={manualSurplus}
              onChange={(e) => setManualSurplus(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-background/50 p-4">
          <div>
            <p className="text-sm text-text-secondary">Diferencia calculada por la app</p>
            <p className={debitDifference >= 0 ? 'text-lg font-semibold text-brand-accent' : 'text-lg font-semibold text-brand-secondary'}>
              {formatCurrency(debitDifference)}
            </p>
          </div>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white transition hover:bg-brand-primary/90"
            onClick={handleWalletSettingsSave}
          >
            Guardar balances
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-surface p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Apariencia</h2>
          <p className="text-xs text-text-secondary">Personaliza el tema de la aplicación.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            Claro
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            Oscuro
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              theme === 'system'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            Sistema
          </button>
        </div>
      </section>
    </div>
  );
}

