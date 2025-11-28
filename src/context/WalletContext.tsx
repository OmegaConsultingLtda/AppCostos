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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>(defaultData);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppState;
        // Ensure we merge with default structure to avoid missing fields if schema changes
        setAppState(prevState => ({
            ...defaultData,
            ...data,
            wallets: data.wallets || defaultData.wallets
        }));
      } else {
        // Initialize new user with default data
        setDoc(docRef, defaultData);
        setAppState(defaultData);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveData = async (newData: AppState) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), newData);
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
      setSelectedYear
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
