'use client';

import React from 'react';
import { useWallet } from '@/context/WalletContext';

// Seed data for QA environment
const getSeedData = () => ({
  wallets: [
    {
      id: 1,
      name: "Personal",
      transactions: [
        {
          id: 1,
          description: "Supermercado",
          amount: 50000,
          date: new Date().toISOString().slice(0, 10),
          type: 'expense_debit' as const,
          category: 'Compras',
          subcategory: 'Supermercado'
        },
        {
          id: 2,
          description: "Sueldo",
          amount: 1000000,
          date: new Date().toISOString().slice(0, 10),
          type: 'income' as const,
          category: 'Ingresos',
          subcategory: null
        }
      ],
      previousMonthTransactions: [
        {
          id: 101,
          description: "Gasto Anterior",
          amount: 30000,
          date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10),
          type: 'expense_debit' as const,
          category: 'Transporte',
          subcategory: 'Bencina'
        }
      ],
      fixedIncomes: [
        {
          id: 1,
          description: "Sueldo",
          expectedAmount: 1000000,
          payments: {}
        }
      ],
      installments: [
        {
          id: 1,
          description: "Notebook",
          totalAmount: 600000,
          totalInstallments: 12,
          paidInstallments: 2,
          type: 'credit_card' as const,
          cardId: 1
        }
      ],
      creditCards: [
        {
          id: 1,
          name: "Visa",
          limit: 2000000,
          bankAvailable: 1400000
        }
      ],
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
      bankDebitBalance: 500000,
      bankCreditBalance: 0,
      manualSurplus: {}
    }
  ],
  currentWalletId: 1,
  geminiApiKey: "test-key-qa",
  exchangeRates: {
    USD: 950,
    UF: 38000,
    lastUpdated: new Date().toISOString()
  }
});

export default function QATools() {
  const { appState, setAppState, saveData, currentWallet } = useWallet();

  const handleLoadSeedData = () => {
    if (!confirm("¿Seguro que quieres sobreescribir TUS DATOS con los datos de prueba? Esta acción no se puede deshacer.")) {
      return;
    }

    const seedData = getSeedData();
    setAppState(seedData);
    void saveData(seedData);
    alert("Datos de prueba cargados y guardados (temporary local mode).");
  };

  const handleCopyPreviousMonth = () => {
    if (!currentWallet || !confirm("¿Copiar todas las transacciones del mes anterior al mes actual? Los montos y fechas se ajustarán.")) {
      return;
    }

    if (!currentWallet.previousMonthTransactions || currentWallet.previousMonthTransactions.length === 0) {
      alert("No se encontraron transacciones en el mes anterior para copiar.");
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const transactionsToCopy = currentWallet.previousMonthTransactions.map(tx => {
      const prevDate = new Date(tx.date);
      const newDate = new Date(currentYear, currentMonth, prevDate.getDate() + 1);
      
      return {
        ...tx,
        id: Date.now() + Math.random(),
        date: newDate.toISOString().slice(0, 10),
        description: `${tx.description} (Copiado)`
      };
    });

    const updatedWallets = appState.wallets.map(w => {
      if (w.id === currentWallet.id) {
        return {
          ...w,
          transactions: [...w.transactions, ...transactionsToCopy]
        };
      }
      return w;
    });

    const newState = { ...appState, wallets: updatedWallets };
    setAppState(newState);
    void saveData(newState);
    alert(`${transactionsToCopy.length} transacciones copiadas al mes actual.`);
  };

  return (
    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-yellow-400 font-bold text-lg">⚠️ HERRAMIENTAS DE QA</span>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={handleLoadSeedData}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Cargar Datos de Prueba
        </button>
        
        <button
          onClick={handleCopyPreviousMonth}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Copiar Mes Anterior
        </button>
      </div>

      <div className="text-xs text-yellow-300 mt-4">
        <p>Estas herramientas solo están disponibles en el entorno de QA.</p>
        <p className="mt-1">No aparecerán en producción.</p>
      </div>
    </div>
  );
}

