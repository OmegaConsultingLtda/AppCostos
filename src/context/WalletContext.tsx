'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Wallet } from '@/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

export type AppUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

const LOCAL_STORAGE_KEY_PREFIX = 'appcostos:appState';

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

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const didInit = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadStateForUser = (uid: string) => {
      const key = `${LOCAL_STORAGE_KEY_PREFIX}:${uid}`;
      try {
        const stored = window.localStorage.getItem(key);
        if (!stored) {
          setAppState(defaultData);
          return;
        }
        const parsed = JSON.parse(stored) as Partial<AppState>;
        setAppState(() => ({
          ...defaultData,
          ...parsed,
          wallets: Array.isArray(parsed.wallets)
            ? (parsed.wallets as AppState['wallets'])
            : defaultData.wallets,
        }));
      } catch (error) {
        console.warn('Failed to read app state from localStorage:', error);
        setAppState(defaultData);
      }
    };

    const mapAuthUser = (authUser: { id: string; email?: string | null; user_metadata?: any }) => {
      const displayName =
        authUser.user_metadata?.full_name ??
        authUser.user_metadata?.name ??
        authUser.email ??
        null;
      return { uid: authUser.id, email: authUser.email ?? null, displayName } satisfies AppUser;
    };

    const refreshUser = async (silent: boolean) => {
      if (!silent && !didInit.current) setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !data.user) {
          setUser(null);
          setAppState(defaultData);
          return;
        }
        const mapped = mapAuthUser(data.user);
        setUser(mapped);
        loadStateForUser(mapped.uid);
      } finally {
        if (!cancelled && !didInit.current) {
          setLoading(false);
          didInit.current = true;
        }
      }
    };

    // Initial load (not silent)
    void refreshUser(false);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const authUser = session?.user;
      if (!authUser) {
        setUser(null);
        setAppState(defaultData);
        return;
      }
      const mapped = mapAuthUser(authUser);
      setUser(mapped);
      loadStateForUser(mapped.uid);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    // When navigation happens (e.g. /login -> / via Server Action redirect),
    // the browser Supabase client doesn't emit onAuthStateChange (it didn't perform the login).
    // Re-check the session so the app doesn't get stuck with user=null until a full refresh.
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return;
      const displayName =
        data.user.user_metadata?.full_name ??
        data.user.user_metadata?.name ??
        data.user.email ??
        null;
      setUser({ uid: data.user.id, email: data.user.email ?? null, displayName });
    })();
  }, [pathname, supabase]);

  const saveData = async (newData: AppState) => {
    try {
      setAppState(newData);
      const key = user?.uid ? `${LOCAL_STORAGE_KEY_PREFIX}:${user.uid}` : LOCAL_STORAGE_KEY_PREFIX;
      window.localStorage.setItem(key, JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving data:', error);
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
