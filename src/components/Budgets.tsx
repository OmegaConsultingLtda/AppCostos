'use client';

import React, { useMemo, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Budget, Wallet } from '@/types';
import { formatCurrency } from '@/utils/format';
import clsx from 'clsx';

interface BudgetViewModel {
  category: string;
  budget: Budget;
  spent: number;
  subcategorySpent: Record<string, number>;
}

const defaultBudget = (): Budget => ({
  total: 0,
  type: 'variable',
  subcategories: {},
  payments: {},
  config: {
    priority: 3,
    flexible: false
  }
});

export default function Budgets() {
  const {
    currentWallet,
    selectedMonth,
    selectedYear,
    appState,
    setAppState,
    saveData
  } = useWallet();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [newSubcategoryNames, setNewSubcategoryNames] = useState<Record<string, string>>({});

  const monthlyTransactions = useMemo(() => {
    if (!currentWallet) return [];
    return currentWallet.transactions.filter(tx => {
      const [year, month] = tx.date.split('-').map(Number);
      return year === selectedYear && month - 1 === selectedMonth && tx.type !== 'income';
    });
  }, [currentWallet, selectedMonth, selectedYear]);

  const budgetView = useMemo<BudgetViewModel[]>(() => {
    if (!currentWallet) return [];
    const categories = Object.keys(currentWallet.transactionCategories || {}).filter(cat => cat !== 'Ingresos');

    return categories.map(category => {
      const baseBudget = currentWallet.budgets?.[category] ?? defaultBudget();
      const spent = monthlyTransactions
        .filter(tx => tx.category === category)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const subcategorySpent = monthlyTransactions
        .filter(tx => tx.category === category && tx.subcategory)
        .reduce<Record<string, number>>((acc, tx) => {
          if (!tx.subcategory) return acc;
          acc[tx.subcategory] = (acc[tx.subcategory] || 0) + tx.amount;
          return acc;
        }, {});

      return {
        category,
        budget: baseBudget,
        spent,
        subcategorySpent
      };
    });
  }, [currentWallet, monthlyTransactions]);

  const totals = useMemo(() => {
    return budgetView.reduce(
      (acc, item) => {
        if (item.budget.type === 'recurrent') {
          acc.recurrent.planned += item.budget.total || 0;
          acc.recurrent.spent += item.spent;
        } else {
          acc.variable.planned += item.budget.total || 0;
          acc.variable.spent += item.spent;
        }
        return acc;
      },
      {
        recurrent: { planned: 0, spent: 0 },
        variable: { planned: 0, spent: 0 }
      }
    );
  }, [budgetView]);

  const cloneWallet = (wallet: Wallet): Wallet => JSON.parse(JSON.stringify(wallet));

  const updateWallet = (updater: (wallet: Wallet) => Wallet) => {
    if (!currentWallet) return;
    const updatedWallets = appState.wallets.map(wallet => {
      if (wallet.id !== currentWallet.id) return wallet;
      return updater(cloneWallet(wallet));
    });
    const newState = { ...appState, wallets: updatedWallets };
    setAppState(newState);
    void saveData(newState);
  };

  const updateBudget = (category: string, handler: (budget: Budget) => Budget) => {
    updateWallet(wallet => {
      const budgets = { ...(wallet.budgets || {}) };
      const current = JSON.parse(JSON.stringify(budgets[category] ?? defaultBudget()));
      budgets[category] = handler(current);
      return { ...wallet, budgets };
    });
  };

  const handleBudgetTotalChange = (category: string, value: string) => {
    const amount = Number(value) || 0;
    updateBudget(category, budget => ({ ...budget, total: amount }));
  };

  const handleBudgetTypeChange = (category: string, type: Budget['type']) => {
    updateBudget(category, budget => ({ ...budget, type }));
  };

  const handlePriorityChange = (category: string, value: string) => {
    const priority = Math.min(5, Math.max(1, Number(value) || 1));
    updateBudget(category, budget => ({
      ...budget,
      config: { ...budget.config, priority }
    }));
  };

  const handleFlexibleToggle = (category: string, checked: boolean) => {
    updateBudget(category, budget => ({
      ...budget,
      config: { ...budget.config, flexible: checked }
    }));
  };

  const handleSubcategoryBudgetChange = (category: string, sub: string, value: string) => {
    const amount = Number(value) || 0;
    updateBudget(category, budget => ({
      ...budget,
      subcategories: {
        ...(budget.subcategories || {}),
        [sub]: amount
      }
    }));
  };

  const handleAddSubcategory = (category: string) => {
    const name = newSubcategoryNames[category]?.trim();
    if (!name) return;
    updateWallet(wallet => {
      const transactionCategories = { ...(wallet.transactionCategories || {}) };
      const categories = [...(transactionCategories[category] || [])];
      if (!categories.includes(name)) {
        categories.push(name);
      }
      transactionCategories[category] = categories;
      const budgets = { ...(wallet.budgets || {}) };
      const budget = structuredClone(budgets[category] ?? defaultBudget());
      budget.subcategories = { ...(budget.subcategories || {}), [name]: 0 };
      budgets[category] = budget;
      return {
        ...wallet,
        transactionCategories,
        budgets
      };
    });
    setNewSubcategoryNames(prev => ({ ...prev, [category]: '' }));
  };

  if (!currentWallet) {
    return <div className="text-gray-400">Selecciona una billetera para ver los presupuestos.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Presupuestos Recurrentes"
          planned={totals.recurrent.planned}
          spent={totals.recurrent.spent}
        />
        <SummaryCard
          title="Presupuestos Variables"
          planned={totals.variable.planned}
          spent={totals.variable.spent}
        />
      </div>

      <div className="space-y-4">
        {budgetView.map(({ category, budget, spent, subcategorySpent }) => {
          const subcategories = currentWallet.transactionCategories?.[category] || [];
          const remaining = (budget.total || 0) - spent;
          const progress = budget.total ? Math.min(100, (spent / budget.total) * 100) : 0;
          return (
            <div key={category} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-text-secondary">{budget.type === 'recurrent' ? 'Recurrente' : 'Variable'}</p>
                  <h3 className="text-2xl font-semibold text-text-primary">{category}</h3>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex flex-col text-right">
                    <span className="text-text-secondary">Gastado</span>
                    <span className="text-lg font-semibold text-text-primary">{formatCurrency(spent)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-text-secondary">Restante</span>
                    <span className={clsx('text-lg font-semibold', remaining < 0 ? 'text-brand-secondary' : 'text-brand-accent')}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    progress > 90 ? 'bg-brand-secondary' : progress > 75 ? 'bg-yellow-500' : 'bg-brand-accent'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase text-text-secondary">Tipo</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                    value={budget.type}
                    onChange={(e) => handleBudgetTypeChange(category, e.target.value as Budget['type'])}
                  >
                    <option value="recurrent">Recurrente</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-text-secondary">Presupuesto Total</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                    value={budget.total ?? 0}
                    min={0}
                    onChange={(e) => handleBudgetTotalChange(category, e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-text-secondary">Prioridad</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                    value={budget.config?.priority ?? 3}
                    onChange={(e) => handlePriorityChange(category, e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-text-secondary">Flexible</label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-2">
                    <input
                      id={`flexible-${category}`}
                      type="checkbox"
                      className="h-4 w-4 accent-brand-accent"
                      checked={budget.config?.flexible ?? false}
                      onChange={(e) => handleFlexibleToggle(category, e.target.checked)}
                    />
                    <label htmlFor={`flexible-${category}`} className="text-sm text-text-secondary">Permitir ajuste</label>
                  </div>
                </div>
              </div>

              <button
                className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary/80"
                onClick={() => setExpanded(prev => (prev === category ? null : category))}
              >
                <span>{expanded === category ? 'Ocultar detalle' : 'Ver subcategorías y pagos'}</span>
                <span>{expanded === category ? '▲' : '▼'}</span>
              </button>

              {expanded === category && (
                <div className="mt-4 space-y-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-background/40 p-4">
                  {subcategories.length === 0 ? (
                    <p className="text-sm text-text-secondary">No hay subcategorías definidas.</p>
                  ) : (
                    subcategories.map(sub => {
                      const subBudget = budget.subcategories?.[sub] ?? 0;
                      const subSpent = subcategorySpent[sub] || 0;
                      const subRemaining = subBudget - subSpent;
                      return (
                        <div key={sub} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-background/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">{sub}</p>
                              <p className="text-xs text-text-secondary">Gastado: {formatCurrency(subSpent)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-text-secondary">Presupuesto</label>
                              <input
                                type="number"
                                min={0}
                                className="w-28 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                                value={subBudget}
                                onChange={(e) => handleSubcategoryBudgetChange(category, sub, e.target.value)}
                              />
                              <span className={clsx('text-xs font-semibold', subRemaining < 0 ? 'text-brand-secondary' : 'text-brand-accent')}>
                                {formatCurrency(subRemaining)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      placeholder="Nueva subcategoría"
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm text-text-primary focus:border-brand-accent focus:outline-none"
                      value={newSubcategoryNames[category] || ''}
                      onChange={(e) => setNewSubcategoryNames(prev => ({ ...prev, [category]: e.target.value }))}
                    />
                    <button
                      className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90"
                      onClick={() => handleAddSubcategory(category)}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  planned: number;
  spent: number;
}

const SummaryCard = ({ title, planned, spent }: SummaryCardProps) => {
  const remaining = planned - spent;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface p-5 shadow-sm">
      <p className="text-sm uppercase tracking-widest text-text-secondary">{title}</p>
      <div className="mt-3 text-3xl font-bold text-text-primary">{formatCurrency(planned)}</div>
      <div className="mt-2 text-sm text-text-secondary">Presupuestado para el mes</div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-background/60 p-3">
          <p className="text-text-secondary">Gastado</p>
          <p className="text-lg font-semibold text-brand-secondary">{formatCurrency(spent)}</p>
        </div>
        <div className="rounded-xl bg-background/60 p-3">
          <p className="text-text-secondary">Disponible</p>
          <p className={clsx('text-lg font-semibold', remaining >= 0 ? 'text-brand-accent' : 'text-brand-secondary')}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>
    </div>
  );
};

