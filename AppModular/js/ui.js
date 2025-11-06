// ui.js
// Hardened / defensive tweaks: safer DOM access, fewer noisy console errors, Chart and API guards.

import * as state from './state.js';
import { updateDataInFirestore, saveDataToFirestore } from './firebase.js';

// --- Helpers ---
const $ = (id) => document.getElementById(id);
const safeSetText = (id, text) => { const el = $(id); if (el) el.textContent = text; };
const safeHtml = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

// --- Utility Functions ---

export const formatCurrency = (amount, currency = 'CLP') => {
    if (typeof amount !== 'number') amount = Number(amount) || 0;
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

export const formatNumberInput = (input) => {
    if (!input) return;
    const format = (numStr) => {
        if (!numStr) return '';
        const num = parseInt(numStr.toString().replace(/[^\d]/g, ''), 10);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('es-CL').format(num);
    };

    const handleInput = (e) => {
        const value = e.target.value;
        const numericValue = (value || '').toString().replace(/[^\d]/g, '');
        const formattedValue = format(numericValue);
        
        if (value !== formattedValue) {
            e.target.value = formattedValue;
        }
    };
    // Avoid adding duplicate listeners by removing previous if present (best-effort)
    try {
        input.removeEventListener('input', handleInput);
    } catch (e) { /* ignore */ }
    input.addEventListener('input', handleInput);
    if (input.value) {
        input.value = format(input.value);
    }
};

export const getNumericValue = (value) => {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Para el formato numérico 'es-CL', los puntos son separadores de miles.
        // Se deben eliminar antes de convertir el string a un número.
        const cleanedString = value.toString().replace(/\./g, '');
        // Usamos parseInt ya que la app parece manejar principalmente montos enteros.
        const parsed = parseInt(cleanedString, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

export const formatYmdToDmy = (ymdString) => {
    if (!ymdString || !ymdString.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
    const [year, month, day] = ymdString.split('-');
    return `${day}/${month}/${year}`;
};


// --- Main UI Rendering Functions ---

export const renderAll = () => {
    if(!state.wallets) return;
    renderWalletSelector();
    updateWalletNameHeaders();
    updateDashboard();
    renderCategorySpending();
    renderTransactions();
    renderFixedIncomes();
    renderInstallments();
    renderBudgets();
    renderSettings();
    populateCategoryDropdown();
    populateCategoryFilterDropdown();

    // Apply numeric formatting to known inputs (best-effort if they exist)
    [
        'previousMonthSurplusInput', 'bankDebitBalanceInput', 'bankCreditBalanceInput',
        'creditCardLimitInput', 'amount', 'fixedIncomeExpectedAmount', 'installmentTotalAmount',
        'installmentTotal'
    ].forEach(id => {
        const input = $(id);
        if (input) formatNumberInput(input);
    });
};

export const initializeAppUI = () => {
    if (!state.wallets) return;
    fetchEconomicIndicators(true).catch(err => {
        // Non-fatal: we already log inside fetchEconomicIndicators
        console.warn('fetchEconomicIndicators failed during init:', err);
    });
    initializeDateSelectors();
    renderAll();
};

export const initializeDateSelectors = () => {
    const monthSelector = $('monthSelector');
    const yearSelector = $('yearSelector');
    if (!monthSelector || !yearSelector) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const updateMonthOptions = () => {
        const selectedYearValue = parseInt(yearSelector.value) || currentYear;
        const maxMonth = (selectedYearValue === currentYear) ? currentMonth : 11;
        const previouslySelectedMonth = parseInt(monthSelector.value);
        
        monthSelector.innerHTML = '';
        const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        
        months.forEach((month, index) => {
            if (index <= maxMonth) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = month;
                monthSelector.appendChild(option);
            }
        });

        if (!isNaN(previouslySelectedMonth) && previouslySelectedMonth <= maxMonth) {
             monthSelector.value = previouslySelectedMonth;
        } else {
             monthSelector.value = maxMonth;
        }
    };

    yearSelector.innerHTML = '';
    const startYear = currentYear - 2;
    for (let i = startYear; i <= currentYear; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelector.appendChild(option);
    }

    yearSelector.value = currentYear;
    updateMonthOptions();
    monthSelector.value = currentMonth;
    
    state.setSelectedYear(currentYear);
    state.setSelectedMonth(currentMonth);
};


// --- Component Rendering Functions ---

export const renderTransactions = () => {
    const tableBody = $('transactionsTable');
    if (!tableBody) return;
    
    const getTypeBadge = (type) => {
        if (type === 'income') return `<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-blue-500 text-white"><i class="fas fa-arrow-down"></i>Ingreso</span>`;
        if (type === 'expense_debit') return `<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-orange-500 text-white"><i class="fas fa-wallet"></i>Gasto (Débito)</span>`;
        if (type === 'expense_credit') return `<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-purple-600 text-white"><i class="far fa-credit-card"></i>Gasto (Crédito)</span>`;
        return '';
    };

    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;
    
    let monthlyTransactions = (currentWallet.transactions || []).filter(t => {
        const [year, month] = (t.date || '').split('-').map(Number);
        return (month - 1) === state.selectedMonth && year === state.selectedYear;
    });

    let filteredByType = monthlyTransactions.filter(tx => {
        if (state.currentFilter === 'all') return true;
        if (state.currentFilter === 'income') return tx.type === 'income';
        if (state.currentFilter === 'expense') return tx.type && tx.type.startsWith('expense');
        return false;
    });
    
    let fullyFiltered = filteredByType;
    if (state.filterCategory !== 'all') {
        fullyFiltered = filteredByType.filter(tx => tx.category === state.filterCategory);
    }

    fullyFiltered.sort((a, b) => {
        let valA = a[state.sortColumn];
        let valB = b[state.sortColumn];
        if (state.sortColumn === 'amount') {
            valA = a.type === 'income' ? valA : -valA;
            valB = b.type === 'income' ? valB : -valB;
        }
        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;
        return state.sortDirection === 'asc' ? comparison : -comparison;
    });

    document.querySelectorAll('#transaction-table-header th[data-sort]').forEach(th => {
        const icon = th.querySelector('i');
        if (icon) {
            if (th.dataset.sort === state.sortColumn) {
                icon.className = state.sortDirection === 'asc' ? 'fas fa-sort-up text-white' : 'fas fa-sort-down text-white';
            } else {
                icon.className = 'fas fa-sort text-gray-400';
            }
        }
    });
    
    tableBody.innerHTML = '';
    fullyFiltered.forEach(tx => {
        const row = document.createElement('tr');
        row.classList.add('table-row');
        row.innerHTML = `
            <td class="p-3 font-medium text-white">${tx.description || ''}</td>
            <td class="p-3 text-sm">${formatYmdToDmy(tx.date || '')}</td>
            <td class="p-3 hidden sm:table-cell">
                 ${tx.category || ''}
                ${tx.subcategory ? `<span class="block text-xs text-gray-400">${tx.subcategory}</span>` : ''}
            </td>
            <td class="p-3 hidden md:table-cell">${getTypeBadge(tx.type)}</td>
            <td class="p-3 text-right font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}">
                ${tx.type === 'income' ? '+' : '-'} ${formatCurrency(Number(tx.amount) || 0)}
            </td>
            <td class="p-3 text-center space-x-2">
                <button class="edit-transaction-btn text-yellow-400 hover:text-yellow-300" data-id="${tx.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-transaction-btn text-red-500 hover:text-red-400" data-id="${tx.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    const table = tableBody.parentElement;
    if (!table) return;
    let tfoot = table.querySelector('tfoot');
    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);
    }
    const totalNeto = fullyFiltered.reduce((sum, tx) => tx.type === 'income' ? sum + (Number(tx.amount) || 0) : sum - (Number(tx.amount) || 0), 0);
    tfoot.innerHTML = `
        <tr class="table-header font-bold">
            <td class="p-3" colspan="4">Total Neto</td>
            <td class="p-3 text-right ${totalNeto >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(totalNeto)}</td>
            <td class="p-3"></td>
        </tr>
    `;
};

export const renderFixedIncomes = () => {
    const listContainer = $('fixedIncomesList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet || !currentWallet.fixedIncomes) return;

    let totalExpected = 0;
    
    currentWallet.fixedIncomes.forEach(income => {
        totalExpected += Number(income.expectedAmount) || 0;
        const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
        const paymentInfo = income.payments?.[periodKey] || {};
        const realAmount = paymentInfo.amount ?? '';
        const isReceived = Boolean(paymentInfo.received);
        
        const item = document.createElement('div');
        item.className = 'p-4 border border-gray-700 rounded-lg bg-gray-800/50';
        item.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div class="flex-grow">
                    <p class="font-bold text-white">${income.description || ''}</p>
                    <p class="text-sm text-gray-400">Esperado: ${formatCurrency(Number(income.expectedAmount) || 0)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button class="edit-fixed-income-btn text-yellow-400 hover:text-yellow-300" data-id="${income.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-fixed-income-btn text-red-500 hover:text-red-400" data-id="${income.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <label class="text-sm text-gray-400">Monto Real:</label>
                    <input type="text" inputmode="numeric" data-id="${income.id}" value="${realAmount}" class="fixed-income-real-amount w-full sm:w-32 bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-right">
                </div>
                <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-gray-300">Recibido:</label>
                    <div class="relative inline-block w-10 align-middle select-none">
                        <input type="checkbox" data-id="${income.id}" class="fixed-income-received-toggle toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isReceived ? 'checked' : ''}>
                        <label class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
        const numInput = item.querySelector('.fixed-income-real-amount');
        if (numInput) formatNumberInput(numInput);
    });

    safeSetText('fixedIncomeTotal', formatCurrency(totalExpected));
};

export const renderInstallments = () => {
    const tableBody = $('installmentsTable');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet || !currentWallet.installments) return;
    
    currentWallet.installments.forEach(item => {
        const monthlyPayment = item.totalInstallments > 0 ? (Number(item.totalAmount) || 0) / item.totalInstallments : 0;
        const remainingBalance = monthlyPayment * (item.totalInstallments - (item.paidInstallments || 0));
        const isPaidOff = (item.paidInstallments || 0) >= item.totalInstallments;
        const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;

        const row = document.createElement('tr');
        row.classList.add('table-row');
        row.innerHTML = `
            <td class="p-3 font-medium text-white">${item.description || ''}</td>
            <td class="p-3 text-right text-orange-400 font-semibold">${formatCurrency(monthlyPayment)}</td>
            <td class="p-3 text-center">
                <span class="font-semibold ${isPaidOff ? 'text-green-400' : 'text-white'}">${item.paidInstallments || 0}</span> / ${item.totalInstallments || 0}
            </td>
            <td class="p-3 text-right font-bold hidden sm:table-cell ${isPaidOff ? 'text-gray-500' : 'text-red-400'}">${formatCurrency(remainingBalance)}</td>
            <td class="p-3 text-center">
                 <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" data-id="${item.id}" class="payment-toggle-checkbox toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${item.payments?.[periodKey] ? 'checked' : ''}>
                    <label for="toggle-payment-${item.id}" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                </div>
            </td>
            <td class="p-3 text-center space-x-1">
                <button class="unpay-installment-btn bg-orange-600 hover:bg-orange-500 text-white font-bold py-1 px-2 rounded-lg text-xs" data-id="${item.id}" ${item.paidInstallments <= 0 ? 'disabled' : ''}>-1</button>
                <button class="pay-installment-btn bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-2 rounded-lg text-xs" data-id="${item.id}" ${isPaidOff ? 'disabled' : ''}>+1</button>
                <button class="edit-installment-btn text-yellow-400 hover:text-yellow-300" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-installment-btn text-red-500 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    const table = tableBody.parentElement;
    if (!table) return;
    let tfoot = table.querySelector('tfoot');
    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);
    }

    const totalMonthlyPayment = currentWallet.installments.reduce((sum, item) => {
        return sum + (item.totalInstallments > 0 ? (Number(item.totalAmount) || 0) / item.totalInstallments : 0);
    }, 0);

    const totalRemainingBalance = currentWallet.installments.reduce((sum, item) => {
        const monthlyPayment = item.totalInstallments > 0 ? (Number(item.totalAmount) || 0) / item.totalInstallments : 0;
        const remaining = monthlyPayment * (item.totalInstallments - (item.paidInstallments || 0));
        return sum + remaining;
    }, 0);

    tfoot.innerHTML = `
        <tr class="table-header font-bold">
            <td class="p-3">Totales</td>
            <td class="p-3 text-right text-orange-400">${formatCurrency(totalMonthlyPayment)}</td>
            <td class="p-3"></td>
            <td class="p-3 text-right text-red-400 hidden sm:table-cell">${formatCurrency(totalRemainingBalance)}</td>
            <td class="p-3" colspan="2"></td>
        </tr>
    `;
    
    // NOTE: event listeners moved to handlers.js as previously discussed
};

export const renderBudgets = () => {
    const recurrentBudgetList = $('recurrentBudgetList');
    const variableBudgetList = $('variableBudgetList');
    if (!recurrentBudgetList || !variableBudgetList) return;
    
    // --- Preserve open categories state ---
    const openCategories = new Set();
    document.querySelectorAll('.category-toggle-btn i.rotate-180').forEach(icon => {
        const targetId = icon.closest('.category-toggle-btn')?.dataset.target;
        if (targetId) openCategories.add(targetId);
    });
    
    recurrentBudgetList.innerHTML = '';
    variableBudgetList.innerHTML = '';
    
    const wallet = state.getCurrentWallet();
    if (!wallet) return;

    // --- Migration logic (conservative) ---
    if (!wallet.budgets) wallet.budgets = {};
    Object.values(wallet.budgets).forEach(budgetData => {
        if (budgetData?.payments) {
            Object.keys(budgetData.payments).forEach(periodKey => {
                const paymentValue = budgetData.payments[periodKey];
                if (typeof paymentValue === 'number' || (paymentValue && typeof paymentValue.amount === 'undefined' && !Object.values(paymentValue).some(v => typeof v === 'object'))) {
                    if (budgetData.type === 'recurrent' && Object.keys(wallet.transactionCategories[Object.keys(wallet.budgets).find(k => wallet.budgets[k] === budgetData)] || {}).length > 0) {
                        // preserve old structure if complex
                    } else {
                         budgetData.payments[periodKey] = {
                            amount: typeof paymentValue === 'number' ? paymentValue : (paymentValue.amount || 0),
                            type: paymentValue?.type || 'expense_debit'
                        };
                    }
                }
            });
        }
    });

    Object.keys(wallet.transactionCategories || {}).forEach(category => {
        if (category === 'Ingresos') return;
        const budgetValue = wallet.budgets[category];
        if (typeof budgetValue === 'number' || budgetValue === undefined || (budgetValue && typeof budgetValue.type === 'undefined')) {
             const oldValue = (typeof budgetValue === 'number') ? budgetValue : (budgetValue?.total || 0);
            wallet.budgets[category] = {
                total: oldValue,
                subcategories: budgetValue?.subcategories || {},
                type: category === 'Cuentas' || category === 'Transporte' ? 'recurrent' : 'variable',
                payments: budgetValue?.payments || {}
            };
        }
    });
    
    const monthlyTransactions = (wallet.transactions || []).filter(t => {
        const [year, month] = (t.date || '').split('-').map(Number);
        return (month - 1) === state.selectedMonth && year === state.selectedYear;
    });
    
    let totalRecurrentBudget = 0;
    let totalVariableBudget = 0;
    let totalRecurrentPaid = 0;
    let totalVariablePaid = 0;

    const createBudgetHTML = (category, index, spentAmount) => {
        const budgetData = wallet.budgets[category] || { total: 0, subcategories: {}, type: 'variable', payments: {} };
        if (!budgetData.payments) budgetData.payments = {};
        
        const subcategories = wallet.transactionCategories[category] || [];
        let subcategoryHTML = '';
        let subcategoriesBudgetSum = 0;
        let isCategoryTotalDisabled = false;

        if (subcategories.length > 0 && budgetData.type === 'recurrent') {
            isCategoryTotalDisabled = true;
            subcategories.forEach(sub => {
                subcategoriesBudgetSum += budgetData.subcategories[sub] || 0;
            });
            budgetData.total = subcategoriesBudgetSum;
        }
        
        let budgetedAmount = budgetData.total || 0;
        const categoryBudgetValueForInput = budgetData.total ?? '';

        if (subcategories.length > 0) {
            subcategoryHTML += '<div class="mt-4 pl-4 border-l-2 border-gray-700 space-y-4">';
            subcategories.forEach(sub => {
                const subBudget = budgetData.subcategories[sub] || 0;
                const subBudgetValueForInput = budgetData.subcategories[sub] ?? '';
                
                let subPaymentHTML = '';
                if (budgetData.type === 'recurrent') {
                    const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
                    const paidInfo = budgetData.payments?.[periodKey]?.[sub] || {};
                    const paidAmount = paidInfo.amount || '';
                    const paymentType = paidInfo.type || 'expense_debit';
                    const isPaid = paidAmount > 0;
                    subPaymentHTML = `
                        <div class="mt-3 pt-3 border-t border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <label class="text-xs font-medium text-gray-400">Pagado:</label>
                                <div class="relative inline-block w-8 align-middle select-none">
                                    <input type="checkbox" id="paid-toggle-${category}-${sub.replace(/\s+/g, '-')}" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isPaid ? 'checked' : ''}>
                                    <label for="paid-toggle-${category}-${sub.replace(/\s+/g, '-')}" class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-600"></label>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <select data-category="${category}" data-subcategory="${sub}" class="recurrent-payment-type-select bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-xs">
                                    <option value="expense_debit" ${paymentType === 'expense_debit' ? 'selected' : ''}>Débito</option>
                                    <option value="expense_credit" ${paymentType === 'expense_credit' ? 'selected' : ''}>Crédito</option>
                                </select>
                                <input type="text" inputmode="numeric" data-category="${category}" data-subcategory="${sub}" value="${paidAmount}" class="recurrent-paid-amount-input w-24 bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-right">
                            </div>
                        </div>
                    `;
                }

                subcategoryHTML += `
                    <div class="bg-gray-900/50 p-3 rounded-lg">
                        <div class="flex flex-wrap justify-between items-center gap-1 text-sm">
                            <div class="flex items-center">
                                <span class="text-gray-400">${sub}</span>
                                <button class="edit-subcategory-btn text-yellow-400 hover:text-yellow-300 opacity-50 hover:opacity-100 ml-2" data-category="${category}" data-subcategory="${sub}"><i class="fas fa-pencil-alt"></i></button>
                                <button class="delete-subcategory-btn text-red-500 hover:text-red-400 opacity-50 hover:opacity-100 ml-2" data-category="${category}" data-subcategory="${sub}">&times;</button>
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="text-xs text-gray-400">Presupuesto subcategoría</label>
                                <input type="text" inputmode="numeric" value="${subBudgetValueForInput}" data-category="${category}" data-subcategory="${sub}" class="subcategory-budget-input bg-gray-700 border border-gray-600 text-white rounded-lg p-1 w-28 text-right">
                            </div>
                        </div>
                        ${subPaymentHTML}
                    </div>
                `;
            });
            subcategoryHTML += '</div>';
        } else {
             subcategoryHTML = '<p class="text-sm text-gray-500 mt-4 pl-4 border-l-2 border-gray-700 py-2">No hay subcategorías definidas.</p>';
        }
        
        const percentage = budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;
        const remaining = budgetedAmount - spentAmount;
        let progressBarColor = percentage > 90 ? 'bg-red-500' : (percentage > 75 ? 'bg-yellow-500' : 'bg-green-500');
        const categoryId = `category-${index}`;
        
        let paymentHTML = '';
        if (budgetData.type === 'recurrent' && subcategories.length === 0) {
            const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
            const paidInfo = budgetData.payments?.[periodKey] || {};
            const paidAmount = paidInfo.amount || '';
            const paymentType = paidInfo.type || 'expense_debit';
            const isPaid = paidAmount > 0;
            paymentHTML = `
                <div class="mt-4 pt-4 border-t border-gray-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <label class="text-sm font-medium text-gray-300">Cuenta Pagada:</label>
                        <div class="relative inline-block w-10 align-middle select-none">
                            <input type="checkbox" id="paid-toggle-${category}" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isPaid ? 'checked' : ''}>
                            <label for="paid-toggle-${category}" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600"></label>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <div class="flex items-center gap-2 w-full">
                            <label for="payment-type-${category}" class="text-sm text-gray-400 w-1/3 sm:w-auto">Método:</label>
                            <select id="payment-type-${category}" data-category="${category}" class="recurrent-payment-type-select w-2/3 sm:w-auto bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-xs">
                                <option value="expense_debit" ${paymentType === 'expense_debit' ? 'selected' : ''}>Débito</option>
                                <option value="expense_credit" ${paymentType === 'expense_credit' ? 'selected' : ''}>Crédito</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2 w-full">
                            <label for="paid-amount-${category}" class="text-sm text-gray-400 w-1/3 sm:w-auto">Monto Pagado:</label>
                            <input type="text" inputmode="numeric" id="paid-amount-${category}" data-category="${category}" value="${paidAmount}" class="recurrent-paid-amount-input w-2/3 sm:w-28 bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-right">
                        </div>
                    </div>
                </div>
            `;
        }

        const budgetItem = document.createElement('div');
        budgetItem.className = "p-4 border border-gray-700 rounded-lg bg-gray-800/50";
        budgetItem.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
                 <div class="flex items-center gap-3">
                    <button class="category-toggle-btn text-gray-400 hover:text-white w-6 text-center" data-target="sub-wrapper-${categoryId}">
                        <i class="fas fa-chevron-down transition-transform duration-200"></i>
                    </button>
                    <h4 class="font-bold text-white text-lg">${category}</h4>
                    <button class="edit-category-btn text-yellow-400 hover:text-yellow-300 text-sm ml-2 opacity-50 hover:opacity-100" data-category="${category}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-category-btn text-red-500 hover:text-red-400 text-sm ml-2 opacity-50 hover:opacity-100" data-category="${category}"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="flex items-center gap-2">
                    <label for="budget-${category}" class="text-sm text-gray-400">Presupuesto Total:</label>
                    <input type="text" inputmode="numeric" id="budget-${category}" data-category="${category}" value="${categoryBudgetValueForInput}" 
                           class="category-budget-input bg-gray-700 border border-gray-600 text-white rounded-lg p-1 w-32 text-sm text-right ${isCategoryTotalDisabled ? 'bg-gray-800' : ''}" 
                           ${isCategoryTotalDisabled ? 'disabled' : ''}>
                </div>
            </div>
            <div class="flex justify-between items-center mb-1 text-sm">
                <span class="text-white">${formatCurrency(spentAmount)} gastado</span>
                <span class="font-semibold ${remaining < 0 ? 'text-red-400' : 'text-gray-300'}">${formatCurrency(remaining)} restante</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                <div class="${progressBarColor} h-2.5 rounded-full" style="width: ${Math.min(100, percentage)}%"></div>
            </div>
            <div id="sub-wrapper-${categoryId}" class="hidden">
                ${subcategoryHTML}
                 <div class="mt-4 pt-4 border-t border-gray-700">
                    <h4 class="text-sm font-semibold text-white mb-2">Agregar Subcategoría</h4>
                    <div class="flex gap-2">
                        <input type="text" data-category-input="${category}" placeholder="Nombre de la subcategoría" class="new-subcategory-input w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-1">
                        <button class="add-subcategory-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-sm" data-category="${category}">Agregar</button>
                    </div>
                </div>
            </div>
            ${paymentHTML}
        `;
        return budgetItem;
    };

    Object.keys(wallet.transactionCategories || {}).sort((a,b) => a.localeCompare(b)).forEach((category, index) => {
        if (category === 'Ingresos' || category === '[Pago de Deuda]') return;
        
        const budgetData = wallet.budgets[category];
        if (!budgetData) return;
        
        const spentAmount = monthlyTransactions
            .filter(t => t.category === category && (t.type || '').startsWith('expense'))
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const budgetItem = createBudgetHTML(category, index, spentAmount);

        if (budgetData.type === 'recurrent') {
            recurrentBudgetList.appendChild(budgetItem);
            totalRecurrentBudget += budgetData.total || 0;
            totalRecurrentPaid += spentAmount;
        } else { 
            variableBudgetList.appendChild(budgetItem);
            totalVariableBudget += budgetData.total || 0;
            totalVariablePaid += spentAmount;
        }

        const wrapperId = budgetItem.querySelector('[id^="sub-wrapper-"]')?.id;
        if (wrapperId && openCategories.has(wrapperId)) {
            budgetItem.querySelector(`#${wrapperId}`)?.classList.remove('hidden');
            const icon = budgetItem.querySelector('.category-toggle-btn i');
            if (icon) icon.classList.add('rotate-180');
        }
    });
    
    safeSetText('recurrentBudgetTotal', formatCurrency(totalRecurrentBudget));
    safeSetText('variableBudgetTotal', formatCurrency(totalVariableBudget));
    safeSetText('recurrentPaidTotal', formatCurrency(totalRecurrentPaid));
    safeSetText('variablePaidTotal', formatCurrency(totalVariablePaid));

    // Event listeners for inputs moved to handlers.js (keeps ui focused on rendering)
};

export const renderWalletSelector = () => {
    const walletSelector = $('walletSelector');
    if (!walletSelector || !Array.isArray(state.wallets)) return;
    walletSelector.innerHTML = '';
    
    state.wallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet.id;
        option.textContent = wallet.name;
        if (wallet.id === state.currentWalletId) {
            option.selected = true;
        }
        walletSelector.appendChild(option);
    });
};

export const renderSettings = () => {
    const wallet = state.getCurrentWallet();
    if (!wallet) return;
    
    const creditEl = $('creditCardLimitInput');
    if (creditEl) creditEl.value = wallet.creditCardLimit || '';
    const geminiEl = $('geminiApiKeyInput');
    if (geminiEl) geminiEl.value = state.geminiApiKey || '';

    const walletList = $('walletList');
    if (walletList) {
        walletList.innerHTML = '';
        state.wallets.forEach(w => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-gray-800 p-2 rounded-lg';
            li.innerHTML = `
                <span class="text-white wallet-name cursor-pointer" data-wallet-id="${w.id}">${w.name}</span>
                <div class="flex items-center gap-3">
                    <button class="edit-wallet-btn text-yellow-400 hover:text-yellow-300" data-wallet-id="${w.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-wallet-btn text-red-500 hover:text-red-400 ${state.wallets.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" data-wallet-id="${w.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            walletList.appendChild(li);
        });
    }
};

export const updateDashboard = () => {
    const wallet = state.getCurrentWallet();
    if (!wallet) return;

    // --- Previous Month Surplus ---
    const surplusInput = $('previousMonthSurplusInput');
    const surplusKey = `${state.selectedYear}-${state.selectedMonth}`;
    if (surplusInput) {
        if (wallet.manualSurplus && wallet.manualSurplus[surplusKey] !== undefined) {
            surplusInput.value = wallet.manualSurplus[surplusKey];
        } else {
            surplusInput.value = '';
        }
    }
    const cumulativeSurplus = getNumericValue(surplusInput?.value);

    // --- Transactions calculations ---
    const monthlyTransactions = (wallet.transactions || []).filter(t => {
        const [year, month] = (t.date || '').split('-').map(Number);
        return (month - 1) === state.selectedMonth && year === state.selectedYear;
    });
    
    const totalMonthlyIncomeValue = monthlyTransactions.filter(t => (t.type || '') === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
    const monthlyVariableExpenses = monthlyTransactions.filter(t => (t.type || '').startsWith('expense')).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const monthlyDebitExpenses = monthlyTransactions.filter(t => (t.type || '') === 'expense_debit').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const monthlyCreditExpenses = monthlyTransactions.filter(t => (t.type || '') === 'expense_credit').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    // --- Pending recurrent budgets ---
    let pendingRecurrentBudgetsAmount = 0;
    let pendingRecurrentBudgetsCount = 0;

    if (wallet.budgets) {
        Object.entries(wallet.budgets).forEach(([category, budgetData]) => {
            if (budgetData?.type === 'recurrent') {
                const subcategories = wallet.transactionCategories[category] || [];
                if (subcategories.length === 0) {
                    const isPaid = monthlyTransactions.some(tx => tx.isRecurrentPayment && tx.category === category && !tx.subcategory);
                    if (!isPaid) {
                        const budgetAmount = budgetData.total || 0;
                        if (budgetAmount > 0) {
                            pendingRecurrentBudgetsAmount += budgetAmount;
                            pendingRecurrentBudgetsCount++;
                        }
                    }
                } else {
                    subcategories.forEach(sub => {
                        const isSubPaid = monthlyTransactions.some(tx => tx.isRecurrentPayment && tx.category === category && tx.subcategory === sub);
                        if (!isSubPaid) {
                            const subBudgetAmount = budgetData.subcategories[sub] || 0;
                            if (subBudgetAmount > 0) {
                                pendingRecurrentBudgetsAmount += subBudgetAmount;
                                pendingRecurrentBudgetsCount++;
                            }
                        }
                    });
                }
            }
        });
    }
    
    // --- Cash flow logic ---
    const totalIncome = totalMonthlyIncomeValue + (cumulativeSurplus || 0);
    const flujoDeCaja = totalIncome - monthlyVariableExpenses;
    
    const flowDetailDebitEl = $('flowDetailDebit');
    if (flowDetailDebitEl) flowDetailDebitEl.innerHTML = `<span class="text-red-400">- </span>${formatCurrency(monthlyDebitExpenses)}`;
    const flowDetailCreditEl = $('flowDetailCredit');
    if (flowDetailCreditEl) flowDetailCreditEl.innerHTML = `<span class="text-red-400">- </span>${formatCurrency(monthlyCreditExpenses)}`;
    const flowDetailTotalExpensesEl = $('flowDetailTotalExpenses');
    if (flowDetailTotalExpensesEl) flowDetailTotalExpensesEl.textContent = `- ${formatCurrency(monthlyVariableExpenses)}`;
    const flowDetailIncomeEl = $('flowDetailIncome');
    if (flowDetailIncomeEl) flowDetailIncomeEl.innerHTML = `<span class="text-green-400 font-bold mr-1">+</span>${formatCurrency(totalMonthlyIncomeValue)}`;
    const flowDetailTotalIncomeEl = $('flowDetailTotalIncome');
    if (flowDetailTotalIncomeEl) flowDetailTotalIncomeEl.textContent = formatCurrency(totalIncome);
    
    const flujoDeCajaEl = $('flowDetailCashFlow');
    if (flujoDeCajaEl) {
        flujoDeCajaEl.textContent = `${flujoDeCaja >= 0 ? '+' : '-'} ${formatCurrency(Math.abs(flujoDeCaja))}`;
        flujoDeCajaEl.classList.toggle('text-green-400', flujoDeCaja >= 0);
        flujoDeCajaEl.classList.toggle('text-red-400', flujoDeCaja < 0);
    }
    
    const projectedNextMonthIncome = (wallet.fixedIncomes || []).reduce((sum, income) => sum + (Number(income.expectedAmount) || 0), 0);
    const projectedNextMonthInstallments = (wallet.installments || [])
        .filter(item => (item.paidInstallments || 0) < (item.totalInstallments || 0))
        .reduce((sum, item) => sum + ((item.totalInstallments > 0) ? ((Number(item.totalAmount) || 0) / item.totalInstallments) : 0), 0);
    const totalProjectedBudgets = Object.values(wallet.budgets || {}).reduce((sum, budget) => sum + (budget.total || 0), 0);
    const totalProjectedExpenses = projectedNextMonthInstallments + totalProjectedBudgets;
    const projectedNextMonthNet = projectedNextMonthIncome - totalProjectedExpenses;
    const bufferForNextMonth = Math.max(0, -projectedNextMonthNet);
    const disponibleParaGastar = flujoDeCaja - bufferForNextMonth;

    const flowDetailNextMonthCoverEl = $('flowDetailNextMonthCover');
    if (flowDetailNextMonthCoverEl) flowDetailNextMonthCoverEl.innerHTML = `<span class="text-red-400">- </span>${formatCurrency(bufferForNextMonth)}`;
    
    const disponibleParaGastarEl = $('flowDetailAvailableToSpend');
    if (disponibleParaGastarEl) {
        disponibleParaGastarEl.textContent = `${disponibleParaGastar >= 0 ? '+' : '-'} ${formatCurrency(Math.abs(disponibleParaGastar))}`;
        disponibleParaGastarEl.classList.remove('text-white', 'text-green-400', 'text-red-400');
        disponibleParaGastarEl.classList.add(disponibleParaGastar >= 0 ? 'text-green-400' : 'text-red-400');
    }

    safeSetText('pendingExpensesCount', String(pendingRecurrentBudgetsCount));
    safeSetText('pendingExpensesAmount', formatCurrency(pendingRecurrentBudgetsAmount));
    
    const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
    const pendingInstallmentsThisMonth = (wallet.installments || []).filter(item => {
        const isNotPaidOff = (item.paidInstallments || 0) < (item.totalInstallments || 0);
        const isNotPaidThisMonth = !(item.payments && item.payments[periodKey]);
        return isNotPaidOff && isNotPaidThisMonth;
    });
    const pendingInstallmentsCount = pendingInstallmentsThisMonth.length;
    const pendingInstallmentsAmount = pendingInstallmentsThisMonth.reduce((sum, item) => {
        const monthlyPayment = item.totalInstallments > 0 ? ((Number(item.totalAmount) || 0) / item.totalInstallments) : 0;
        return sum + monthlyPayment;
    }, 0);

    safeSetText('pendingInstallmentsCount', String(pendingInstallmentsCount));
    safeSetText('pendingInstallmentsAmount', formatCurrency(pendingInstallmentsAmount));

    // --- Credit card logic ---
    const creditCardInstallmentDebt = (wallet.installments || [])
        .filter(i => i.type === 'credit_card')
        .reduce((sum, item) => {
            const monthlyPayment = item.totalInstallments > 0 ? ((Number(item.totalAmount) || 0) / item.totalInstallments) : 0;
            return sum + (monthlyPayment * ((item.totalInstallments || 0) - (item.paidInstallments || 0)));
    }, 0);

    const realCreditLimit = (wallet.creditCardLimit || 0) - creditCardInstallmentDebt;
    const creditCardLimitInfoEl = $('creditCardLimitInfo');
    if (creditCardLimitInfoEl) creditCardLimitInfoEl.innerHTML = `<span class="text-green-400">${formatCurrency(realCreditLimit)}</span> / ${formatCurrency(wallet.creditCardLimit || 0)}`;
    
    const availableCreditAfterUsage = realCreditLimit - monthlyCreditExpenses;
    safeSetText('usedCredit', formatCurrency(monthlyCreditExpenses));
    safeSetText('availableCredit', formatCurrency(availableCreditAfterUsage));

    // --- Reconciliation ---
    const appDebitBalance = totalIncome - monthlyDebitExpenses;
    safeSetText('reconciliationAppDebitBalance', formatCurrency(appDebitBalance));
    
    const bankDebitBalanceInput = $('bankDebitBalanceInput');
    if (bankDebitBalanceInput) bankDebitBalanceInput.value = (wallet.bankDebitBalance || 0) ? new Intl.NumberFormat('es-CL').format(wallet.bankDebitBalance) : '';
    const debitDifference = appDebitBalance - (wallet.bankDebitBalance || 0);

    const debitDiffContainer = $('reconciliationDebitDifference');
    const debitDiffAmountEl = $('differenceDebitAmount');
    if (debitDiffAmountEl) debitDiffAmountEl.textContent = formatCurrency(debitDifference);
    
    if (debitDiffContainer && debitDiffAmountEl) {
        if (Math.abs(debitDifference) < 1 && (wallet.bankDebitBalance || 0) !== 0) {
            debitDiffContainer.className = 'flex justify-between items-center p-3 rounded-lg transition-colors duration-300 bg-green-500/20';
            debitDiffAmountEl.className = 'font-bold text-lg text-green-400';
        } else if (debitDifference !== 0) {
            debitDiffContainer.className = 'flex justify-between items-center p-3 rounded-lg transition-colors duration-300 bg-red-500/20';
            debitDiffAmountEl.className = 'font-bold text-lg text-red-400';
        } else {
            debitDiffContainer.className = 'flex justify-between items-center p-3 rounded-lg transition-colors duration-300 bg-gray-800';
            debitDiffAmountEl.className = 'font-bold text-lg';
        }
    }

    safeSetText('reconciliationAppCreditBalance', formatCurrency(availableCreditAfterUsage));
    const bankCreditBalanceInputEl = $('bankCreditBalanceInput');
    if (bankCreditBalanceInputEl) bankCreditBalanceInputEl.value = (wallet.bankCreditBalance || 0) ? new Intl.NumberFormat('es-CL').format(wallet.bankCreditBalance) : '';
    const creditDifference = availableCreditAfterUsage - (wallet.bankCreditBalance || 0);

    const creditDiffContainer = $('reconciliationCreditDifference');
    const creditDiffAmountEl = $('differenceCreditAmount');
    if (creditDiffAmountEl) creditDiffAmountEl.textContent = formatCurrency(creditDifference);

    if (creditDiffContainer && creditDiffAmountEl) {
        if (Math.abs(creditDifference) < 1 && (wallet.bankCreditBalance || 0) !== 0) {
            creditDiffContainer.className = 'flex justify-between items-center p-3 rounded-lg transition-colors duration-300 bg-green-500/20';
            creditDiffAmountEl.className = 'font-bold text-lg text-green-400';
        } else if (creditDifference !== 0) {
            creditDiffContainer.className = 'flex justify-between items-center p-3 rounded-lg transition-colors duration-300 bg-red-500/20';
            creditDiffAmountEl.className = 'font-bold text-lg text-red-400';
        } else {
            creditDiffContainer.className = 'flex justify-between items-center p-3 rounded-lg transition-colors duration-300 bg-gray-800';
            creditDiffAmountEl.className = 'font-bold text-lg';
        }
    }

    // --- Monthly comparison ---
    const comparisonContainer = $('monthlyComparisonContainer');
    if (!comparisonContainer) return;
    comparisonContainer.innerHTML = ''; 
    const budgetedCategories = Object.keys(wallet.budgets || {});

    if (budgetedCategories.length === 0) {
        comparisonContainer.innerHTML = `<p class="text-sm text-gray-400">No hay presupuestos definidos para comparar.</p>`;
    } else {
        const calculateTotals = (txs) => {
            return (txs || []).filter(t => (t.type || '').startsWith('expense')).reduce((acc, tx) => {
                if (!acc[tx.category]) acc[tx.category] = 0;
                acc[tx.category] += (Number(tx.amount) || 0);
                return acc;
            }, {});
        };
        
        const currentMonthTotals = calculateTotals(monthlyTransactions);
        const previousMonthTotals = calculateTotals(wallet.previousMonthTransactions || []);

        budgetedCategories.sort().forEach(category => {
            const currentAmount = currentMonthTotals[category] || 0;
            const previousAmount = previousMonthTotals[category] || 0;
            const difference = currentAmount - previousAmount;
            
            let diffText = '-';
            let diffColor = 'text-gray-400';
            let icon = '<i class="fas fa-minus fa-fw"></i>';
            
            if (difference > 0) {
                const percentage = previousAmount > 0 ? `(${(difference / previousAmount * 100).toFixed(0)}%)` : '';
                diffText = `+${formatCurrency(difference)} ${percentage}`;
                diffColor = 'text-red-400';
                icon = '<i class="fas fa-arrow-up fa-fw"></i>';
            } else if (difference < 0) {
                const percentage = previousAmount > 0 ? `(${(difference / previousAmount * 100).toFixed(0)}%)` : '';
                diffText = `${formatCurrency(difference)} ${percentage}`;
                diffColor = 'text-green-400';
                icon = '<i class="fas fa-arrow-down fa-fw"></i>';
            }
            
            const item = document.createElement('div');
            item.innerHTML = `
                <div class="category-comparison-item text-sm">
                    <div class="flex justify-between items-center cursor-pointer p-2 rounded-lg hover:bg-gray-800/50">
                        <div class="flex items-center gap-3">
                            <button class="expand-comparison-btn text-gray-400 hover:text-white w-6 text-center" data-category="${category}">
                                <i class="fas fa-chevron-right transition-transform duration-200"></i>
                            </button>
                            <span class="font-semibold text-white">${category}</span>
                        </div>
                        <span class="font-bold text-lg text-white">${formatCurrency(currentAmount)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs mt-1 px-2">
                        <span class="text-gray-400">Mes Anterior: ${formatCurrency(previousAmount)}</span>
                        <span class="font-semibold ${diffColor} flex items-center gap-1">
                            ${icon}
                            ${diffText}
                        </span>
                    </div>
                </div>
                <div class="subcategory-comparison-container hidden ml-8 pl-4 border-l border-gray-700 space-y-2 mt-2"></div>
                <hr class="border-gray-700 last:hidden">
            `;
            comparisonContainer.appendChild(item);
        });
    }
};

export const renderCategorySpending = () => {
    const chartContainer = $('chartContainer');
    const transactionListContainer = $('categoryTransactionList');
    const chartEl = $('categoryPieChart');
    if (!chartEl) return;
    const ctx = chartEl.getContext ? chartEl.getContext('2d') : null;
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;

    const chartTitleEl = $('categoryChartTitle');
    const backBtn = $('backToCategoriesBtn');

    const monthlyTransactions = (currentWallet.transactions || []).filter(t => {
        const [year, month] = (t.date || '').split('-').map(Number);
        return (month - 1) === state.selectedMonth && year === state.selectedYear;
    });
    
    const expenses = monthlyTransactions
        .filter(t => (t.type || '').startsWith('expense') && t.category !== '[Pago de Deuda]');
    
    // Destroy previous chart safely
    try {
        if (state.categoryChart && typeof state.categoryChart.destroy === 'function') {
            state.categoryChart.destroy();
        }
    } catch (e) {
        // ignore chart destroy errors
    }

    // If Chart library not available, skip chart rendering
    if (typeof Chart === 'undefined' || !ctx) {
        if (chartContainer) chartContainer.classList.add('hidden');
        if (transactionListContainer) transactionListContainer.classList.remove('hidden');
        if (backBtn) backBtn.classList.add('hidden');
        return;
    }

    if (state.currentChartView === 'transactions') {
        if (chartContainer) chartContainer.classList.add('hidden');
        if (transactionListContainer) transactionListContainer.classList.remove('hidden');
        if (backBtn) backBtn.classList.remove('hidden');
        if (chartTitleEl) chartTitleEl.textContent = `Movimientos en: ${state.selectedSubcategoryForDrilldown || ''}`;

        const filteredTx = expenses.filter(t => 
            t.category === state.selectedCategoryForDrilldown && 
            (t.subcategory || 'Sin Subcategoría') === state.selectedSubcategoryForDrilldown
        );
        
        let listHTML = '<div class="space-y-3">';
        if (filteredTx.length > 0) {
             filteredTx.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(tx => {
                listHTML += `
                    <div class="flex justify-between items-center text-sm p-2 rounded-lg bg-gray-800/50">
                        <div>
                            <p class="font-medium text-white">${tx.description || ''}</p>
                            <p class="text-xs text-gray-400">${formatYmdToDmy(tx.date || '')}</p>
                        </div>
                        <p class="font-semibold text-red-400">${formatCurrency(Number(tx.amount) || 0)}</p>
                    </div>
                `;
            });
        } else {
            listHTML += `<p class="text-sm text-gray-400">No hay movimientos para esta subcategoría.</p>`;
        }
        listHTML += '</div>';
        transactionListContainer.innerHTML = listHTML;
        return;
    }

    if (chartContainer) chartContainer.classList.remove('hidden');
    if (transactionListContainer) transactionListContainer.classList.add('hidden');
    
    let labels = [];
    let data = [];
    
    if (state.currentChartView === 'subcategories' && state.selectedCategoryForDrilldown) {
        if (chartTitleEl) chartTitleEl.textContent = `Desglose de: ${state.selectedCategoryForDrilldown}`;
        if (backBtn) backBtn.classList.remove('hidden');

        const subcategoryExpenses = expenses
            .filter(t => t.category === state.selectedCategoryForDrilldown)
            .reduce((acc, tx) => {
                const sub = tx.subcategory || 'Sin Subcategoría';
                if (!acc[sub]) acc[sub] = 0;
                acc[sub] += Number(tx.amount) || 0;
                return acc;
            }, {});
        
        labels = Object.keys(subcategoryExpenses);
        data = Object.values(subcategoryExpenses);

    } else { // Default 'categories' view
        if (chartTitleEl) chartTitleEl.textContent = 'Análisis de Gastos por Categoría';
        if (backBtn) backBtn.classList.add('hidden');

        const byCategory = expenses.reduce((acc, tx) => {
            if (!acc[tx.category]) acc[tx.category] = 0;
            acc[tx.category] += Number(tx.amount) || 0;
            return acc;
        }, {});
        
        labels = Object.keys(byCategory);
        data = Object.values(byCategory);
    }

    // Create chart safely (wrap in try/catch)
    let newChart = null;
    try {
        newChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#4f46e5', '#f97316', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#eab308', '#64748b', '#06b6d4', '#d946ef'],
                    borderColor: '#1f2937',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#d1d5db', boxWidth: 15, padding: 20 },
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.index;
                            const chart = legend.chart;
                            chart.toggleDataVisibility(index);
                            chart.update();
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) {
                                    const chart = context.chart;
                                    let total = 0;
                                    chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                                        if (chart.getDataVisibility(index)) {
                                           total += chart.data.datasets[0].data[index];
                                        }
                                    });
                                    
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0.0%';
                                    label += `${formatCurrency(context.parsed)} (${percentage})`;
                                }
                                return label;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (!elements || elements.length === 0) return;
                    const dataIndex = elements[0].index;
                    
                    if (state.currentChartView === 'categories') {
                        const category = newChart?.data?.labels?.[dataIndex];
                        const subcategoriesWithSpending = expenses.some(t => t.category === category && t.subcategory);

                        if (subcategoriesWithSpending) {
                            state.setCurrentChartView('subcategories');
                            state.setSelectedCategoryForDrilldown(category);
                            renderCategorySpending();
                        }
                    } else if (state.currentChartView === 'subcategories') {
                        const subcategory = newChart?.data?.labels?.[dataIndex];
                        state.setCurrentChartView('transactions');
                        state.setSelectedSubcategoryForDrilldown(subcategory);
                        renderCategorySpending();
                    }
                }
            }
        });
    } catch (err) {
        console.warn('Failed to render category chart:', err);
    }

    if (newChart) state.setCategoryChart(newChart);
};

// --- Modal and Dropdown Functions ---

export const displayConfirmationModal = (message) => {
    const msg = $('confirmationModalMessage');
    if (msg) msg.textContent = message;
    const modal = $('confirmationModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

export const hideConfirmationModal = () => {
    const modal = $('confirmationModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

export const displayInputModal = (title, placeholder) => {
    const titleEl = $('inputModalTitle');
    const inputField = $('inputModalField');
    const modal = $('inputModal');
    if (!modal || !inputField || !titleEl) return;
    titleEl.textContent = title;
    inputField.placeholder = placeholder;
    inputField.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    try { inputField.focus(); } catch (e) { /* ignore */ }
};

export const hideInputModal = () => {
    const modal = $('inputModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

export const populateCategoryDropdown = (transactionType) => {
    const categorySelect = $('category');
    if (!categorySelect) return;
    
    const selectedValue = categorySelect.value;
    categorySelect.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;

    let categories = Object.keys(currentWallet.transactionCategories || {})
        .filter(cat => cat !== '[Pago de Deuda]');

    if (transactionType && transactionType.startsWith('expense')) {
        categories = categories.filter(cat => cat !== 'Ingresos');
    } else if (transactionType === 'income') {
        categories = ['Ingresos'];
    }

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    if (categories.includes(selectedValue)) {
        categorySelect.value = selectedValue;
    }
};

export const populateSubcategoryDropdown = (selectedCategory, selectedSubcategory = null) => {
    const subcategorySelect = $('subcategory');
    const subcategoryLabel = document.querySelector('label[for="subcategory"]');
    const addSubcategoryBtn = $('addSubcategoryBtn');
    if (!subcategorySelect || !subcategoryLabel || !addSubcategoryBtn) return;
    
    subcategorySelect.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    
    if (!currentWallet || !currentWallet.transactionCategories || !currentWallet.transactionCategories[selectedCategory] || selectedCategory === 'Ingresos' || selectedCategory === '[Pago de Deuda]') {
         subcategorySelect.disabled = true;
         addSubcategoryBtn.disabled = true;
         addSubcategoryBtn.classList.add('opacity-50', 'cursor-not-allowed');
         subcategoryLabel.classList.add('text-gray-500');
         const option = document.createElement('option');
         option.textContent = "N/A";
         subcategorySelect.appendChild(option);
         return;
    }
    
    subcategorySelect.disabled = false;
    addSubcategoryBtn.disabled = false;
    addSubcategoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    subcategoryLabel.classList.remove('text-gray-500');

    const subcategories = currentWallet.transactionCategories[selectedCategory] || [];
    
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Selecciona...";
    subcategorySelect.appendChild(defaultOption);

    subcategories.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        if (sub === selectedSubcategory) {
            option.selected = true;
        }
        subcategorySelect.appendChild(option);
    });
};

export const populateCategoryFilterDropdown = () => {
    const categoryFilterSelect = $('transactionCategoryFilter');
    if (!categoryFilterSelect) return;
    
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;
    
    const savedValue = categoryFilterSelect.value;
    categoryFilterSelect.innerHTML = '';
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todas las categorías';
    categoryFilterSelect.appendChild(allOption);

    const monthlyTransactions = (currentWallet.transactions || []).filter(t => {
        const [year, month] = (t.date || '').split('-').map(Number);
        return (month - 1) === state.selectedMonth && year === state.selectedYear;
    });

    const categoriesInTable = [...new Set((monthlyTransactions || []).map(tx => tx.category))].filter(Boolean);
    
    categoriesInTable.sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilterSelect.appendChild(option);
    });

    if (categoriesInTable.includes(savedValue)) {
        categoryFilterSelect.value = savedValue;
    } else {
        categoryFilterSelect.value = 'all';
    }
};

// --- Tab Management ---

export const setActiveTab = (activeBtn) => {
    if (!activeBtn) return;
    const tabButtons = [
        $('dashboardTabBtn'),
        $('transactionsTabBtn'),
        $('incomeAndBudgetsTabBtn'),
        $('aiAnalysisTabBtn'),
        $('settingsTabBtn')
    ];
    const contentPanels = [
        $('dashboardContent'),
        $('transactionsContent'),
        $('incomeAndBudgetsContent'),
        $('aiAnalysisContent'),
        $('settingsContent')
    ];

    tabButtons.forEach(btn => { if (btn) { btn.classList.remove('tab-active'); btn.classList.add('tab-inactive'); } });
    activeBtn.classList.remove('tab-inactive');
    activeBtn.classList.add('tab-active');

    contentPanels.forEach(content => { if (content) content.classList.add('hidden'); });
    
    if (activeBtn.id === 'dashboardTabBtn') {
        $('dashboardContent')?.classList.remove('hidden');
        updateDashboard();
        renderCategorySpending();
    } else if (activeBtn.id === 'transactionsTabBtn') {
        $('transactionsContent')?.classList.remove('hidden');
        renderTransactions(); 
    } else if (activeBtn.id === 'incomeAndBudgetsTabBtn') {
        $('incomeAndBudgetsContent')?.classList.remove('hidden');
        renderFixedIncomes();
        renderInstallments();
        renderBudgets();
    } else if (activeBtn.id === 'aiAnalysisTabBtn') {
        $('aiAnalysisContent')?.classList.remove('hidden');
    } else if (activeBtn.id === 'settingsTabBtn') {
        $('settingsContent')?.classList.remove('hidden');
        renderSettings();
    }
};

export const setActiveCashflowTab = (activeBtn) => {
    if (!activeBtn) return;
    const tabButtons = [
        $('cashflowTabResume'),
        $('cashflowTabIncome'),
        $('cashflowTabExpenses')
    ];
    const contentPanels = [
        $('cashflowContentResume'),
        $('cashflowContentIncome'),
        $('cashflowContentExpenses')
    ];

    tabButtons.forEach(btn => { if (btn) { btn.classList.remove('cashflow-tab-active'); btn.classList.add('cashflow-tab-inactive'); } });
    activeBtn.classList.remove('cashflow-tab-inactive');
    activeBtn.classList.add('cashflow-tab-active');

    contentPanels.forEach(content => { if (content) content.classList.add('hidden'); });

    if (activeBtn.id === 'cashflowTabResume') {
        $('cashflowContentResume')?.classList.remove('hidden');
    } else if (activeBtn.id === 'cashflowTabIncome') {
        $('cashflowContentIncome')?.classList.remove('hidden');
    } else if (activeBtn.id === 'cashflowTabExpenses') {
        $('cashflowContentExpenses')?.classList.remove('hidden');
    }
};

// --- API and Analysis Functions ---

export const fetchEconomicIndicators = async (isInitialLoad = false) => {
    try {
        const usdPromise = fetch('https://api.exchangerate-api.com/v4/latest/USD')
            .then(res => res.ok ? res.json() : Promise.reject('USD API response not OK'));
        const ufPromise = fetch('https://mindicador.cl/api/uf')
            .then(res => res.ok ? res.json() : Promise.reject('UF API response not OK'));

        const [usdResult, ufResult] = await Promise.allSettled([usdPromise, ufPromise]);
        let rates = { ...(state.exchangeRates || {}) };

        if (usdResult.status === 'fulfilled') {
            const data = usdResult.value;
            rates.USD = data?.rates?.CLP || rates.USD || 950;
            rates.lastUpdated = data?.time_last_update_utc || rates.lastUpdated || null;
        } else {
            console.warn('Failed to fetch exchange rates, using fallback:', usdResult.reason);
        }

        if (ufResult.status === 'fulfilled') {
            const data = ufResult.value;
            if (data?.serie && data.serie.length > 0) {
                rates.UF = data.serie[0].valor || rates.UF || 0;
            }
        } else {
            console.warn('Failed to fetch UF value:', ufResult.reason);
        }
        
        state.setExchangeRates(rates);

        if (!isInitialLoad) {
            try { saveDataToFirestore(); } catch (e) { console.warn('saveDataToFirestore error:', e); }
        }
        renderAll();
    } catch (err) {
        console.warn('fetchEconomicIndicators unexpected error:', err);
        // renderAll still safe to call
        try { renderAll(); } catch (e) { /* ignore */ }
    }
};

async function callGeminiAPI(userQuery) {
    const systemPrompt = "Actúa como un asesor financiero personal en Chile. Eres amigable, alentador y das consejos prácticos. Tu objetivo es ayudar al usuario a mejorar su salud financiera. Responda en español.";
    const apiKey = state.geminiApiKey || "";
    // Guard: do not attempt network call without API key
    if (!apiKey) {
        throw new Error("API key for Gemini is not set.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        // try to read body but guard errors
        let errorBody = null;
        try { errorBody = await response.json(); } catch (e) { /* ignore */ }
        console.warn("API Error Body:", errorBody);
        throw new Error(`API error: ${response.statusText || response.status}`);
    }
    
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error("Invalid response structure from Gemini API.");
    }
    return candidate.content.parts[0].text || null;
}


export const runFullAiAnalysis = async () => {
    const btn = $('runAiAnalysisBtn');
    const loader = $('aiAnalysisLoader');
    const resultContainer = $('aiAnalysisResult');
    const actionsContainer = $('aiAnalysisActions');
    const wallet = state.getCurrentWallet();
    if (!wallet || !btn || !loader || !resultContainer || !actionsContainer) return;

    btn.disabled = true;
    loader.classList.remove('hidden');
    resultContainer.innerHTML = '';
    actionsContainer.classList.add('hidden');

    try {
        const monthlyTransactions = (wallet.transactions || []).filter(t => {
            const [year, month] = (t.date || '').split('-').map(Number);
            return (month - 1) === state.selectedMonth && year === state.selectedYear;
        });

        if (monthlyTransactions.length === 0) {
            resultContainer.innerHTML = `<p class="text-yellow-400">No hay datos suficientes en el período seleccionado para realizar un análisis.</p>`;
            return;
        }

        const monthlyIncome = monthlyTransactions.filter(t => (t.type || '') === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const monthlyExpensesList = monthlyTransactions.filter(t => (t.type || '').startsWith('expense'));
        const totalMonthlyExpenses = monthlyExpensesList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const expensesByCategory = monthlyExpensesList.reduce((acc, tx) => {
            if (!acc[tx.category]) acc[tx.category] = 0;
            acc[tx.category] += Number(tx.amount) || 0; return acc; }, {});

        const financialData = `
            - Ingreso Total: ${formatCurrency(monthlyIncome)}
            - Gasto Total: ${formatCurrency(totalMonthlyExpenses)}
            - Gastos por Categoría: ${JSON.stringify(Object.fromEntries(Object.entries(expensesByCategory).map(([k, v]) => [k, formatCurrency(v)])))}
        `;

        const prompt = `
            Actúa como un consultor financiero experto, analizando los datos de un cliente. Proporciona un análisis financiero para el período actual basado en los siguientes datos.
            Datos del cliente:
            ${financialData}
        `;
        
        const analysisResult = await callGeminiAPI(prompt);

        if (analysisResult) {
            let htmlResult = analysisResult
                .replace(/\*\*(.*?)\*\*/g, '<h3 class="text-lg font-bold text-white mb-2 mt-4">$1</h3>')
                .replace(/^- (.*$)/gm, '<ul><li class="ml-5 list-disc">$1</li></ul>')
                .replace(/^\d+\. (.*$)/gm, '<ol><li class="ml-5 list-decimal">$1</li></ol>')
                .replace(/<\/ul>\s*<ul>/g, '')
                .replace(/<\/ol>\s*<ol>/g, '');

            resultContainer.innerHTML = htmlResult;
            actionsContainer.classList.remove('hidden');
        } else {
            throw new Error("La respuesta de la IA llegó vacía.");
        }

    } catch (error) {
        console.warn("Error en el análisis de IA:", error);
        if ($('aiAnalysisResult')) $('aiAnalysisResult').innerHTML = `<p class="text-red-400">Hubo un error al generar el análisis. Verifica que tu clave de API de Gemini esté guardada en Ajustes o inténtalo más tarde.</p>`;
    } finally {
        loader.classList.add('hidden');
        btn.disabled = false;
    }
};
export const generateAnalysisPDF = () => {
    // jsPDF expected globally
    const docLib = window?.jspdf;
    if (!docLib || !docLib.jsPDF) {
        console.warn("jsPDF not available - cannot generate PDF.");
        return;
    }
    const { jsPDF } = docLib;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const resultContainer = $('aiAnalysisResult');
    if (!resultContainer || !resultContainer.hasChildNodes()) {
        console.warn("No hay análisis para exportar.");
        return;
    }

    const wallet = state.getCurrentWallet();
    const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const period = `${months[state.selectedMonth] || ''} ${state.selectedYear || ''}`;
    const walletName = wallet ? wallet.name : 'Desconocida';
    
    const pageMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (pageMargin * 2);
    let cursorY = pageMargin;

    // --- Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Análisis Financiero con IA', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Billetera: ${walletName}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text(`Período: ${period}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;
    
    // --- Content ---
    doc.setTextColor(0);
    const nodes = Array.from(resultContainer.childNodes || []);

    nodes.forEach(node => {
        if (cursorY > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            cursorY = pageMargin;
        }

        if (node.nodeName === 'H3') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            cursorY += 8;
            const splitTitle = doc.splitTextToSize(node.textContent, contentWidth);
            doc.text(splitTitle, pageMargin, cursorY);
            cursorY += (splitTitle.length * 5) + 2;
        } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            
            const listItems = node.querySelectorAll('li');
            listItems.forEach((li, index) => {
                const prefix = node.nodeName === 'OL' ? `${index + 1}. ` : '•  ';
                const itemText = prefix + li.textContent;
                const splitText = doc.splitTextToSize(itemText, contentWidth - 5);
                
                if (cursorY + (splitText.length * 5) > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    cursorY = pageMargin;
                }
                
                doc.text(splitText, pageMargin + 5, cursorY);
                cursorY += (splitText.length * 5) + 2;
            });
        }
    });

    // --- Pagination ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    try {
        doc.save(`Analisis_Financiero_${walletName}_${(period || '').replace(' ', '_')}.pdf`);
    } catch (e) {
        console.warn('Error saving PDF:', e);
    }
};
export const updateWalletNameHeaders = () => {
    const wallet = state.getCurrentWallet();
    if (!wallet) return;
    document.querySelectorAll('.wallet-name-header').forEach(el => {
        el.innerHTML = `<i class="fas fa-wallet fa-fw mr-2 text-indigo-400"></i> Billetera: ${wallet.name}`;
    });
};
export const handleEditCategory = (oldName) => {
    const wallet = state.getCurrentWallet();
    if (!wallet || oldName === 'Ingresos' || oldName === '[Pago de Deuda]') return;

    displayInputModal(`Editar Categoría`, `Nuevo nombre para "${oldName}"`, async (newName) => {
        if (!newName || newName.trim() === '' || newName === oldName) return;
        newName = newName.trim();
        if (wallet.transactionCategories[newName]) {
            alert(`La categoría "${newName}" ya existe.`);
            return;
        }
        wallet.transactionCategories[newName] = wallet.transactionCategories[oldName];
        delete wallet.transactionCategories[oldName];
        if (wallet.budgets?.[oldName]) {
            wallet.budgets[newName] = wallet.budgets[oldName];
            delete wallet.budgets[oldName];
        }
        (wallet.transactions || []).forEach(tx => { if (tx.category === oldName) tx.category = newName; });
        (wallet.previousMonthTransactions || []).forEach(tx => { if (tx.category === oldName) tx.category = newName; });
        await updateDataInFirestore();
    });
};

export const handleEditSubcategory = (categoryName, oldName) => {
    const wallet = state.getCurrentWallet();
    if (!wallet || !wallet.transactionCategories?.[categoryName]) return;

    displayInputModal(`Editar Subcategoría en "${categoryName}"`, `Nuevo nombre para "${oldName}"`, async (newName) => {
        if (!newName || newName.trim() === '' || newName === oldName) return;
        newName = newName.trim();
        if (wallet.transactionCategories[categoryName].includes(newName)) {
            alert(`La subcategoría "${newName}" ya existe en "${categoryName}".`);
            return;
        }
        const subIndex = wallet.transactionCategories[categoryName].indexOf(oldName);
        if (subIndex > -1) {
            wallet.transactionCategories[categoryName][subIndex] = newName;
        }
        if (wallet.budgets?.[categoryName]?.subcategories?.[oldName] !== undefined) {
            wallet.budgets[categoryName].subcategories[newName] = wallet.budgets[categoryName].subcategories[oldName];
            delete wallet.budgets[categoryName].subcategories[oldName];
        }
        (wallet.transactions || []).forEach(tx => { if (tx.category === categoryName && tx.subcategory === oldName) tx.subcategory = newName; });
        (wallet.previousMonthTransactions || []).forEach(tx => { if (tx.category === categoryName && tx.subcategory === oldName) tx.subcategory = newName; });
        await updateDataInFirestore();
    });
};
