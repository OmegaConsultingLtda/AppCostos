// --- Default Data ---
export const defaultData = {
    wallets: [
        {
            id: 1,
            name: "Personal",
            transactions: [],
            previousMonthTransactions: [],
            fixedIncomes: [],
            installments: [],
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

// --- Global State Variables ---
// Initialize state values to safe defaults so other modules can read them
export let db = null;
export let auth = null;
export let userId = null;

// initialize wallet-related state from defaultData to avoid undefined accesses
export let wallets = Array.isArray(defaultData.wallets) ? defaultData.wallets : [];
export let currentWalletId = defaultData.currentWalletId ?? (wallets[0]?.id ?? null);
export let geminiApiKey = defaultData.geminiApiKey ?? "";
export let exchangeRates = defaultData.exchangeRates ?? { USD: 950, UF: 0, lastUpdated: null };

// sensible initial date selection
export let selectedMonth = (new Date()).getMonth(); // 0-11
export let selectedYear = (new Date()).getFullYear();

export let unsubscribeFromData = null;
export let saveTimeout = null;
export let isInitialLoad = true;
export let sortColumn = 'date';
export let sortDirection = 'desc';
export let filterCategory = 'all';
export let currentFilter = 'all';
export let categoryChart = null;
export let currentChartView = 'categories';
export let selectedCategoryForDrilldown = null;
export let selectedSubcategoryForDrilldown = null;

// --- State Modifiers (Setters) ---
// These setters centralize small guards and lifecycle concerns (e.g. clearing previous timeouts)
// These are intentionally minimal to avoid surprising side effects.

export function setDb(value) { db = value; }
export function setAuth(value) { auth = value; }
export function setUserId(value) { userId = value; }

export function setWallets(value) {
    wallets = Array.isArray(value) ? value : wallets;
    // ensure currentWalletId still valid
    if (!wallets.find(w => w.id === currentWalletId)) {
        currentWalletId = wallets[0]?.id ?? null;
    }
}
export function setCurrentWalletId(value) { currentWalletId = value; }
export function setGeminiApiKey(value) { geminiApiKey = value; }
export function setExchangeRates(value) { exchangeRates = value; }

export function setSelectedMonth(value) { selectedMonth = value; }
export function setSelectedYear(value) { selectedYear = value; }

/**
 * Store the unsubscribe function (from onSnapshot) or null.
 * We don't automatically call previous unsubscribe here to avoid unexpected side effects,
 * but a helper is provided below.
 */
export function setUnsubscribeFromData(value) { unsubscribeFromData = value; }

/**
 * Clear and optionally call the stored unsubscribe function.
 * Use this when you want to guarantee the listener is removed.
 */
export function clearAndUnsetUnsubscribe() {
    try {
        if (typeof unsubscribeFromData === 'function') {
            unsubscribeFromData();
        }
    } catch (e) {
        // ignore errors from unsubscribe
    } finally {
        unsubscribeFromData = null;
    }
}

/**
 * Set save timeout. Clears previous timeout reference to avoid multiple timers.
 * Accepts either a numeric timeout id or null.
 */
export function setSaveTimeout(value) {
    try {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
    } catch (e) {
        // ignore clearTimeout errors
    }
    saveTimeout = value ?? null;
}

export function setIsInitialLoad(value) { isInitialLoad = value; }
export function setSortColumn(value) { sortColumn = value; }
export function setSortDirection(value) { sortDirection = value; }
export function setFilterCategory(value) { filterCategory = value; }
export function setCurrentFilter(value) { currentFilter = value; }
export function setCategoryChart(value) { categoryChart = value; }
export function setCurrentChartView(value) { currentChartView = value; }
export function setSelectedCategoryForDrilldown(value) { selectedCategoryForDrilldown = value; }
export function setSelectedSubcategoryForDrilldown(value) { selectedSubcategoryForDrilldown = value; }

// --- State Accessors (Getters) ---
// Clean way to obtain the current wallet. Returns null when not available.
export const getCurrentWallet = () => (Array.isArray(wallets) ? wallets.find(w => w.id === currentWalletId) : null);

// Utility to reset in-memory state (useful for tests or re-initialization)
export function resetStateToDefaults() {
    db = null;
    auth = null;
    userId = null;
    wallets = Array.isArray(defaultData.wallets) ? JSON.parse(JSON.stringify(defaultData.wallets)) : [];
    currentWalletId = defaultData.currentWalletId ?? (wallets[0]?.id ?? null);
    geminiApiKey = defaultData.geminiApiKey ?? "";
    exchangeRates = defaultData.exchangeRates ?? { USD: 950, UF: 0, lastUpdated: null };
    selectedMonth = (new Date()).getMonth();
    selectedYear = (new Date()).getFullYear();
    clearAndUnsetUnsubscribe();
    setSaveTimeout(null);
    isInitialLoad = true;
    sortColumn = 'date';
    sortDirection = 'desc';
    filterCategory = 'all';
    currentFilter = 'all';
    categoryChart = null;
    currentChartView = 'categories';
    selectedCategoryForDrilldown = null;
    selectedSubcategoryForDrilldown = null;
}
