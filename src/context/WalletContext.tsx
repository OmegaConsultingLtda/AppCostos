'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Wallet } from '@/types';

export type AppUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

// Temporary local-only mode while migrating from Firebase -> Supabase.
const LOCAL_USER: AppUser = {
  uid: 'local',
  email: 'local@appcostos.dev',
  displayName: 'Local User',
};

const LOCAL_STORAGE_KEY = 'appcostos:appState';

const defaultData: AppState = {
  wallets: [
    {
      id: 1,
      name: "Personal",
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
    }
  ],
  currentWalletId: 1,
  geminiApiKey: "",
  exchangeRates: {
    USD: 950,
    UF: 0,
    lastUpdated: null
  }
};

type SortColumn = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';
type TransactionFilter = 'all' | 'income' | 'expense';

interface WalletContextType {
  user: AppUser | null;
  loading: boolean;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  currentWallet: Wallet | undefined;
  saveData: (newData: AppState) => Promise<void>;
  selectedMonth: number;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  selectedYear: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  sortColumn: SortColumn;
  setSortColumn: React.Dispatch<React.SetStateAction<SortColumn>>;
  sortDirection: SortDirection;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  filterCategory: string;
  setFilterCategory: React.Dispatch<React.SetStateAction<string>>;
  currentFilter: TransactionFilter;
  setCurrentFilter: React.Dispatch<React.SetStateAction<TransactionFilter>>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>(defaultData);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currentFilter, setCurrentFilter] = useState<TransactionFilter>('all');

  useEffect(() => {
    // Firebase removed: initialize a local user and load state from localStorage.
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppState>;
        setAppState(() => ({
          ...defaultData,
          ...parsed,
          wallets: Array.isArray(parsed.wallets) ? (parsed.wallets as AppState['wallets']) : defaultData.wallets,
        }));
      }
    } catch (error) {
      console.warn('Failed to read app state from localStorage:', error);
    } finally {
      setUser(LOCAL_USER);
      setLoading(false);
    }
  }, []);

  const saveData = async (newData: AppState) => {
    try {
      setAppState(newData);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error("Error saving data (local mode):", error);
    }
  };

  const currentWallet = appState.wallets.find(w => w.id === appState.currentWalletId);

  return (
    <WalletContext.Provider value={{ 
      user, 
      loading, 
      appState, 
      setAppState, 
      currentWallet, 
      saveData,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      sortColumn,
      setSortColumn,
      sortDirection,
      setSortDirection,
      filterCategory,
      setFilterCategory,
      currentFilter,
      setCurrentFilter
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
