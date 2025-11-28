export interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense_debit' | 'expense_credit';
  category: string;
  subcategory: string | null;
  cardId?: number;
  isFixedIncomePayment?: boolean;
  fixedIncomeId?: number;
  isRecurrentPayment?: boolean;
  periodKey?: string;
  installmentPaymentPortion?: number;
  paidInstallmentIds?: number[];
}

export interface FixedIncome {
  id: number;
  description: string;
  expectedAmount: number;
  payments: {
    [key: string]: {
      amount: number;
      received: boolean;
    };
  };
}

export interface Installment {
  id: number;
  description: string;
  totalAmount: number;
  totalInstallments: number;
  paidInstallments?: number;
  type: 'credit_card' | 'consumer_loan';
  cardId?: number;
  paymentHistory?: {
    [key: string]: {
      amount: number;
      paid: boolean;
      transactionId?: number;
    };
  };
}

export interface CreditCard {
  id: number;
  name: string;
  limit: number;
  bankAvailable: number;
  // Calculated fields that might be useful in UI but not in DB
  currentBalance?: number; 
}

export interface Budget {
  total: number;
  type: 'recurrent' | 'variable';
  subcategories: { [key: string]: number };
  payments?: {
    [key: string]: {
      [key: string]: {
        amount: number;
        type?: string;
        cardId?: number;
      };
    };
  };
  config: {
    priority: number;
    flexible: boolean;
  };
}

export interface Wallet {
  id: number;
  name: string;
  transactions: Transaction[];
  previousMonthTransactions: Transaction[];
  fixedIncomes: FixedIncome[];
  installments: Installment[];
  creditCards: CreditCard[];
  transactionCategories: { [key: string]: string[] };
  budgets: { [key: string]: Budget };
  creditCardLimit: number;
  bankDebitBalance: number;
  bankCreditBalance: number;
  manualSurplus: { [key: string]: number };
}

export interface ExchangeRates {
  USD: number;
  UF: number;
  lastUpdated: string | null;
}

export interface AppState {
  wallets: Wallet[];
  currentWalletId: number;
  geminiApiKey: string;
  exchangeRates: ExchangeRates;
}
