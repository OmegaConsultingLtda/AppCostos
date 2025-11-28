'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppState, Wallet } from '@/types';

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
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>(defaultData);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currentFilter, setCurrentFilter] = useState<TransactionFilter>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAppState(defaultData);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const getAppDocRef = (userId: string) => doc(db, 'users', userId, 'appData', 'main');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const docRef = getAppDocRef(user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppState;
        // Ensure we merge with default structure to avoid missing fields if schema changes
        setAppState(() => ({
            ...defaultData,
            ...data,
            wallets: data.wallets || defaultData.wallets
        }));
      } else {
        // Initialize new user with default data
        void setDoc(docRef, defaultData);
        setAppState(defaultData);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveData = async (newData: AppState) => {
    if (!user) return;
    try {
      await setDoc(getAppDocRef(user.uid), newData, { merge: true });
      // State update happens via onSnapshot
    } catch (error) {
      console.error("Error saving data:", error);
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
