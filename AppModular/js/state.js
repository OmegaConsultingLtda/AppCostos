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

// --- Global State Variables ---
export let db, auth, userId;
export let wallets, currentWalletId, geminiApiKey, exchangeRates;
export let selectedMonth, selectedYear;
export let unsubscribeFromData;
export let saveTimeout;
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
// Estas funciones nos permiten cambiar el valor de las variables desde otros archivos
export function setDb(value) { db = value; }
export function setAuth(value) { auth = value; }
export function setUserId(value) { userId = value; }
export function setWallets(value) { wallets = value; }
export function setCurrentWalletId(value) { currentWalletId = value; }
export function setGeminiApiKey(value) { geminiApiKey = value; }
export function setExchangeRates(value) { exchangeRates = value; }
export function setSelectedMonth(value) { selectedMonth = value; }
export function setSelectedYear(value) { selectedYear = value; }
export function setUnsubscribeFromData(value) { unsubscribeFromData = value; }
export function setSaveTimeout(value) { saveTimeout = value; }
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
// Esta función nos da una forma limpia de obtener la billetera actual
export const getCurrentWallet = () => wallets ? wallets.find(w => w.id === currentWalletId) : null;
