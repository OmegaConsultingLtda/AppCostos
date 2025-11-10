// ui.js

import * as state from './state.js';
import { updateDataInFirestore, saveDataToFirestore } from './firebase.js';

// --- Utility Functions ---

export const formatCurrency = (amount, currency = 'CLP') => {
    if (typeof amount !== 'number') amount = 0;
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
        const numericValue = value.replace(/[^\d]/g, '');
        const formattedValue = format(numericValue);
        
        if (value !== formattedValue) {
            e.target.value = formattedValue;
        }
    };
    input.addEventListener('input', handleInput);
    if(input.value) {
        input.value = format(input.value);
    }
};

export const getNumericValue = (value) => {
    if (typeof value !== 'string') return value;
    return parseFloat(value.replace(/[^\d]/g, '')) || 0;
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
    ['previousMonthSurplusInput', 'bankDebitBalanceInput', 'bankCreditBalanceInput', 'creditCardLimitInput', 'amount', 'fixedIncomeExpectedAmount', 'installmentTotalAmount', 'installmentTotal', 'paymentAmount'].forEach(id => {
        const input = document.getElementById(id);
        if (input) formatNumberInput(input);
    });
};

export const initializeAppUI = () => {
    if (!state.wallets) return;
    fetchEconomicIndicators(true);
    initializeDateSelectors();
    renderAll();
};

export const initializeDateSelectors = () => {
    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const updateMonthOptions = () => {
        const selectedYearValue = parseInt(yearSelector.value);
        const maxMonth = (selectedYearValue === currentYear) ? currentMonth : 11;
        const previouslySelectedMonth = parseInt(monthSelector.value);
        
        monthSelector.innerHTML = '';
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
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
    const tableBody = document.getElementById('transactionsTable');
    if (!tableBody) return;
    
    const getTypeBadge = (type) => {
        if (type === 'income') return `<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-blue-500 text-white"><i class="fas fa-arrow-down"></i>Ingreso</span>`;
        if (type === 'expense_debit') return `<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-orange-500 text-white"><i class="fas fa-wallet"></i>Gasto (Débito)</span>`;
        if (type === 'expense_credit') return `<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-purple-600 text-white"><i class="far fa-credit-card"></i>Gasto (Crédito)</span>`;
        return '';
    };

    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;
    
    let monthlyTransactions = currentWallet.transactions.filter(t => {
        const [year, month] = t.date.split('-').map(Number);
        return month - 1 === state.selectedMonth && year === state.selectedYear;
    });

    let filteredByType = monthlyTransactions.filter(tx => {
        if (state.currentFilter === 'all') return true;
        if (state.currentFilter === 'income') return tx.type === 'income';
        if (state.currentFilter === 'expense') return tx.type.startsWith('expense');
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
        if (th.dataset.sort === state.sortColumn) {
            icon.className = state.sortDirection === 'asc' ? 'fas fa-sort-up text-white' : 'fas fa-sort-down text-white';
        } else {
            icon.className = 'fas fa-sort text-gray-400';
        }
    });
    
    tableBody.innerHTML = '';
    fullyFiltered.forEach(tx => {
        const row = document.createElement('tr');
        row.classList.add('table-row');
        row.innerHTML = `
            <td class="p-3 font-medium text-white">${tx.description}</td>
            <td class="p-3 text-sm">${formatYmdToDmy(tx.date)}</td>
            <td class="p-3 hidden sm:table-cell">
                 ${tx.category}
                ${tx.subcategory ? `<span class="block text-xs text-gray-400">${tx.subcategory}</span>` : ''}
            </td>
            <td class="p-3 hidden md:table-cell">${getTypeBadge(tx.type)}</td>
            <td class="p-3 text-right font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}">
                ${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount)}
            </td>
            <td class="p-3 text-center space-x-2">
                <button class="edit-transaction-btn text-yellow-400 hover:text-yellow-300" data-id="${tx.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-transaction-btn text-red-500 hover:text-red-400" data-id="${tx.id}"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    const table = tableBody.parentElement;
    let tfoot = table.querySelector('tfoot');
    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);
    }
    const totalNeto = fullyFiltered.reduce((sum, tx) => tx.type === 'income' ? sum + tx.amount : sum - tx.amount, 0);
    tfoot.innerHTML = `
        <tr class="table-header font-bold">
            <td class="p-3" colspan="4">Total Neto</td>
            <td class="p-3 text-right ${totalNeto >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(totalNeto)}</td>
            <td class="p-3"></td>
        </tr>
    `;
};

export const renderFixedIncomes = () => {
    const listContainer = document.getElementById('fixedIncomesList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet || !currentWallet.fixedIncomes) return;

    let totalExpected = 0;
    
    currentWallet.fixedIncomes.forEach(income => {
        totalExpected += income.expectedAmount || 0;
        const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
        const paymentInfo = income.payments?.[periodKey] || {};
        const realAmount = paymentInfo.amount ?? '';
        const isReceived = paymentInfo.received || false;
        
        const item = document.createElement('div');
        item.className = 'p-4 border border-gray-700 rounded-lg bg-gray-800/50';
        item.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div class="flex-grow">
                    <p class="font-bold text-white">${income.description}</p>
                    <p class="text-sm text-gray-400">Esperado: ${formatCurrency(income.expectedAmount)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button class="edit-fixed-income-btn text-yellow-400 hover:text-yellow-300" data-id="${income.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-fixed-income-btn text-red-500 hover:text-red-400" data-id="${income.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <label class="text-sm text-gray-400">Monto Real:</label>
                    <input type="text" inputmode="numeric" data-id="${income.id}" value="${realAmount}" class="fixed-income-real-amount w-full sm:w-32 bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-sm text-right" placeholder="Monto real">
                </div>
                <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-gray-300">Recibido:</label>
                    <div class="relative inline-block w-10 align-middle select-none">
                        <input type="checkbox" data-id="${income.id}" class="fixed-income-received-toggle toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isReceived ? 'checked' : ''} ${realAmount === '' || realAmount <= 0 ? 'disabled' : ''}>
                        <label class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
        formatNumberInput(item.querySelector('.fixed-income-real-amount'));
    });

    document.getElementById('fixedIncomeTotal').textContent = formatCurrency(totalExpected);
};
export const renderInstallments = () => {
    const tableBody = document.getElementById('installmentsTable');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet || !currentWallet.installments) return;
    
    currentWallet.installments.forEach(item => {
        const monthlyPayment = item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0;
        const remainingBalance = monthlyPayment * (item.totalInstallments - item.paidInstallments);
        const isPaidOff = item.paidInstallments >= item.totalInstallments;
        const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
        const isPaidThisMonth = item.payments && item.payments[periodKey];

        const row = document.createElement('tr');
        row.classList.add('table-row');
        row.innerHTML = `
            <td class="p-3 font-medium text-white">${item.description}</td>
            <td class="p-3 text-right text-orange-400 font-semibold">${formatCurrency(monthlyPayment)}</td>
            <td class="p-3 text-center">
                <span class="font-semibold ${isPaidOff ? 'text-green-400' : 'text-white'}">${item.paidInstallments}</span> / ${item.totalInstallments}
            </td>
            <td class="p-3 text-right font-bold hidden sm:table-cell ${isPaidOff ? 'text-gray-500' : 'text-red-400'}">${formatCurrency(remainingBalance)}</td>
            <td class="p-3 text-center">
                 <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" data-id="${item.id}" class="payment-toggle-checkbox toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isPaidThisMonth ? 'checked' : ''}/>
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
    let tfoot = table.querySelector('tfoot');
    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);
    }

    const totalMonthlyPayment = currentWallet.installments.reduce((sum, item) => {
        return sum + (item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0);
    }, 0);

    const totalRemainingBalance = currentWallet.installments.reduce((sum, item) => {
        const monthlyPayment = item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0;
        const remaining = monthlyPayment * (item.totalInstallments - item.paidInstallments);
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
    
    // NOTA: La lógica de los botones (addEventListener) se moverá a handlers.js
    // El código original que tenías aquí para los listeners ya no es necesario en este archivo.
};
export const renderBudgets = () => {
    const recurrentBudgetList = document.getElementById('recurrentBudgetList');
    const variableBudgetList = document.getElementById('variableBudgetList');
    if (!recurrentBudgetList || !variableBudgetList) return;
    
    // --- Preservar estado del acordeón ---
    const openCategories = new Set();
    document.querySelectorAll('.category-toggle-btn i.rotate-180').forEach(icon => {
        const targetId = icon.closest('.category-toggle-btn').dataset.target;
        if (targetId) openCategories.add(targetId);
    });
    
    recurrentBudgetList.innerHTML = '';
    variableBudgetList.innerHTML = '';
    
    const wallet = state.getCurrentWallet();
    if (!wallet) return;

    // --- Lógica de Migración de Datos (se mantiene por si acaso) ---
    if (!wallet.budgets) wallet.budgets = {};
    Object.values(wallet.budgets).forEach(budgetData => {
        if (budgetData.payments) {
            Object.keys(budgetData.payments).forEach(periodKey => {
                const paymentValue = budgetData.payments[periodKey];
                if (typeof paymentValue === 'number' || (paymentValue && typeof paymentValue.amount === 'undefined' && !Object.values(paymentValue).some(v => typeof v === 'object'))) {
                    if (budgetData.type === 'recurrent' && Object.keys(wallet.transactionCategories[Object.keys(wallet.budgets).find(k => wallet.budgets[k] === budgetData)] || {}).length > 0) {
                        // No migrar si hay subcategorías y datos antiguos
                    } else {
                         budgetData.payments[periodKey] = {
                            amount: typeof paymentValue === 'number' ? paymentValue : (paymentValue.amount || 0),
                            type: paymentValue.type || 'expense_debit'
                        };
                    }
                }
            });
        }
    });

    Object.keys(wallet.transactionCategories).forEach(category => {
        if (category === 'Ingresos') return;
        const budgetValue = wallet.budgets[category];
        if (typeof budgetValue === 'number' || budgetValue === undefined || budgetValue.type === undefined) {
             const oldValue = (typeof budgetValue === 'number') ? budgetValue : (budgetValue?.total || 0);
            wallet.budgets[category] = {
                total: oldValue,
                subcategories: budgetValue?.subcategories || {},
                type: category === 'Cuentas' || category === 'Transporte' ? 'recurrent' : 'variable',
                payments: budgetValue?.payments || {}
            };
        }
    });
    
    const monthlyTransactions = wallet.transactions.filter(t => {
        const [year, month] = t.date.split('-').map(Number);
        return month - 1 === state.selectedMonth && year === state.selectedYear;
    });
    
    let totalRecurrentBudget = 0;
    let totalVariableBudget = 0;
    let totalRecurrentPaid = 0;
    let totalVariablePaid = 0;

    const createBudgetHTML = (category, index, spentAmount) => {
        const budgetData = wallet.budgets[category];
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
                    const paidInfo = budgetData.payments?.[periodKey]?.[sub];
                    const paidAmount = paidInfo?.amount || '';
                    const paymentType = paidInfo?.type || 'expense_debit';
                    const isPaid = paidAmount > 0;
                    subPaymentHTML = `
                        <div class="mt-3 pt-3 border-t border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <label class="text-xs font-medium text-gray-400">Pagado:</label>
                                <div class="relative inline-block w-8 align-middle select-none">
                                    <input type="checkbox" id="paid-toggle-${category}-${sub.replace(/\s+/g, '-')}" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isPaid ? 'checked' : ''} disabled>
                                    <label for="paid-toggle-${category}-${sub.replace(/\s+/g, '-')}" class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-600"></label>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <select data-category="${category}" data-subcategory="${sub}" class="recurrent-payment-type-select bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-xs w-24">
                                    <option value="expense_debit" ${paymentType === 'expense_debit' ? 'selected' : ''}>Débito</option>
                                    <option value="expense_credit" ${paymentType === 'expense_credit' ? 'selected' : ''}>Crédito</option>
                                </select>
                                <input type="text" inputmode="numeric" data-category="${category}" data-subcategory="${sub}" value="${paidAmount}" class="recurrent-paid-amount-input w-24 bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-xs text-right" placeholder="Monto">
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
                                <input type="text" inputmode="numeric" value="${subBudgetValueForInput}" data-category="${category}" data-subcategory="${sub}" class="subcategory-budget-input bg-gray-800 border border-gray-700 text-white rounded-lg p-1 w-28 text-sm text-right">
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
            const paidInfo = budgetData.payments?.[periodKey];
            const paidAmount = paidInfo?.amount || '';
            const paymentType = paidInfo?.type || 'expense_debit';
            const isPaid = paidAmount > 0;
            paymentHTML = `
                <div class="mt-4 pt-4 border-t border-gray-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <label class="text-sm font-medium text-gray-300">Cuenta Pagada:</label>
                        <div class="relative inline-block w-10 align-middle select-none">
                            <input type="checkbox" id="paid-toggle-${category}" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" ${isPaid ? 'checked' : ''} disabled>
                            <label for="paid-toggle-${category}" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600"></label>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <div class="flex items-center gap-2 w-full">
                            <label for="payment-type-${category}" class="text-sm text-gray-400 w-1/3 sm:w-auto">Método:</label>
                            <select id="payment-type-${category}" data-category="${category}" class="recurrent-payment-type-select w-2/3 sm:w-auto bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-sm">
                                <option value="expense_debit" ${paymentType === 'expense_debit' ? 'selected' : ''}>Débito</option>
                                <option value="expense_credit" ${paymentType === 'expense_credit' ? 'selected' : ''}>Crédito</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2 w-full">
                            <label for="paid-amount-${category}" class="text-sm text-gray-400 w-1/3 sm:w-auto">Monto Pagado:</label>
                            <input type="text" inputmode="numeric" id="paid-amount-${category}" data-category="${category}" value="${paidAmount}" class="recurrent-paid-amount-input w-2/3 sm:w-28 bg-gray-700 border border-gray-600 text-white rounded-lg p-1 text-sm text-right" placeholder="Monto Pagado">
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
                        <input type="text" data-category-input="${category}" placeholder="Nombre de la subcategoría" class="new-subcategory-input w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm">
                        <button class="add-subcategory-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-sm" data-category="${category}">Agregar</button>
                    </div>
                </div>
            </div>
            ${paymentHTML}
        `;
        return budgetItem;
    };

    Object.keys(wallet.transactionCategories).sort((a,b) => a.localeCompare(b)).forEach((category, index) => {
        if (category === 'Ingresos' || category === '[Pago de Deuda]') return;
        
        const budgetData = wallet.budgets[category];
        if (!budgetData) return;
        
        const spentAmount = monthlyTransactions
            .filter(t => t.category === category && t.type.startsWith('expense'))
            .reduce((sum, t) => sum + t.amount, 0);

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
            budgetItem.querySelector(`#${wrapperId}`).classList.remove('hidden');
            const icon = budgetItem.querySelector('.category-toggle-btn i');
            if (icon) icon.classList.add('rotate-180');
        }
    });
    
    document.getElementById('recurrentBudgetTotal').textContent = formatCurrency(totalRecurrentBudget);
    document.getElementById('variableBudgetTotal').textContent = formatCurrency(totalVariableBudget);
    document.getElementById('recurrentPaidTotal').textContent = formatCurrency(totalRecurrentPaid);
    document.getElementById('variablePaidTotal').textContent = formatCurrency(totalVariablePaid);

    // Los event listeners para los inputs se manejarán en handlers.js
};

export const renderWalletSelector = () => {
    const walletSelector = document.getElementById('walletSelector');
    if (!walletSelector) return;
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
    
    document.getElementById('creditCardLimitInput').value = wallet.creditCardLimit || '';
    document.getElementById('geminiApiKeyInput').value = state.geminiApiKey || '';

    const walletList = document.getElementById('walletList');
    if (walletList) {
        walletList.innerHTML = '';
        state.wallets.forEach(w => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-gray-800 p-2 rounded-lg';
            li.innerHTML = `
                <span class="text-white wallet-name cursor-pointer" data-wallet-id="${w.id}">${w.name}</span>
                <div class="flex items-center gap-3">
                    <button class="edit-wallet-btn text-yellow-400 hover:text-yellow-300" data-wallet-id="${w.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-wallet-btn text-red-500 hover:text-red-400 ${state.wallets.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" data-wallet-id="${w.id}" ${state.wallets.length <= 1 ? 'disabled' : ''}>
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

    // --- Remanente Mes Anterior ---
    const surplusInput = document.getElementById('previousMonthSurplusInput');
    const surplusKey = `${state.selectedYear}-${state.selectedMonth}`;
    if (wallet.manualSurplus && wallet.manualSurplus[surplusKey] !== undefined) {
        surplusInput.value = wallet.manualSurplus[surplusKey];
    } else {
        surplusInput.value = '';
    }
    const cumulativeSurplus = getNumericValue(surplusInput.value);

    // --- Cálculos de Transacciones ---
    const monthlyTransactions = wallet.transactions.filter(t => {
        const [year, month] = t.date.split('-').map(Number);
        return month - 1 === state.selectedMonth && year === state.selectedYear;
    });
    
    const totalMonthlyIncomeValue = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const monthlyVariableExpenses = monthlyTransactions.filter(t => t.type.startsWith('expense')).reduce((sum, t) => sum + t.amount, 0);
    const monthlyDebitExpenses = monthlyTransactions.filter(t => t.type === 'expense_debit').reduce((sum, t) => sum + t.amount, 0);
    const monthlyCreditExpenses = monthlyTransactions.filter(t => t.type === 'expense_credit').reduce((sum, t) => sum + t.amount, 0);
    
    // --- Cálculo de Gastos Recurrentes Pendientes ---
    let pendingRecurrentBudgetsAmount = 0;
    let pendingRecurrentBudgetsCount = 0;

    if (wallet.budgets) {
        Object.entries(wallet.budgets).forEach(([category, budgetData]) => {
            if (budgetData.type === 'recurrent') {
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
    
    // --- Lógica de Flujo de Caja ---
    const totalIncome = totalMonthlyIncomeValue + cumulativeSurplus;
    const flujoDeCaja = totalIncome - monthlyVariableExpenses;
    
    document.getElementById('flowDetailDebit').innerHTML = `<span class="text-red-400">- </span>${formatCurrency(monthlyDebitExpenses)}`;
    document.getElementById('flowDetailCredit').innerHTML = `<span class="text-red-400">- </span>${formatCurrency(monthlyCreditExpenses)}`;
    document.getElementById('flowDetailTotalExpenses').textContent = `- ${formatCurrency(monthlyVariableExpenses)}`;
    document.getElementById('flowDetailIncome').innerHTML = `<span class="text-green-400 font-bold mr-1">+</span>${formatCurrency(totalMonthlyIncomeValue)}`;
    document.getElementById('flowDetailTotalIncome').textContent = formatCurrency(totalIncome);
    
    const flujoDeCajaEl = document.getElementById('flowDetailCashFlow');
    flujoDeCajaEl.textContent = `${flujoDeCaja >= 0 ? '+' : '-'} ${formatCurrency(Math.abs(flujoDeCaja))}`;
    flujoDeCajaEl.classList.toggle('text-green-400', flujoDeCaja >= 0);
    flujoDeCajaEl.classList.toggle('text-red-400', flujoDeCaja < 0);
    
    const projectedNextMonthIncome = wallet.fixedIncomes.reduce((sum, income) => sum + income.expectedAmount, 0);
    const projectedNextMonthInstallments = wallet.installments
        .filter(item => item.paidInstallments < item.totalInstallments)
        .reduce((sum, item) => sum + (item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0), 0);
    const totalProjectedBudgets = Object.values(wallet.budgets).reduce((sum, budget) => sum + (budget.total || 0), 0);
    const totalProjectedExpenses = projectedNextMonthInstallments + totalProjectedBudgets;
    const projectedNextMonthNet = projectedNextMonthIncome - totalProjectedExpenses;
    const bufferForNextMonth = Math.max(0, -projectedNextMonthNet);
    const disponibleParaGastar = flujoDeCaja - bufferForNextMonth;

    document.getElementById('flowDetailNextMonthCover').innerHTML = `<span class="text-red-400">- </span>${formatCurrency(bufferForNextMonth)}`;
    
    const disponibleParaGastarEl = document.getElementById('flowDetailAvailableToSpend');
    disponibleParaGastarEl.textContent = `${disponibleParaGastar >= 0 ? '+' : '-'} ${formatCurrency(Math.abs(disponibleParaGastar))}`;
    disponibleParaGastarEl.classList.remove('text-white', 'text-green-400', 'text-red-400');
    disponibleParaGastarEl.classList.add(disponibleParaGastar >= 0 ? 'text-green-400' : 'text-red-400');

    // --- Tarjetas de Resumen (Gastos y Cuotas Pendientes) ---
    document.getElementById('pendingExpensesCount').textContent = pendingRecurrentBudgetsCount;
    document.getElementById('pendingExpensesAmount').textContent = formatCurrency(pendingRecurrentBudgetsAmount);
    
    const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;
    const pendingInstallmentsThisMonth = wallet.installments.filter(item => {
        const isNotPaidOff = item.paidInstallments < item.totalInstallments;
        const isNotPaidThisMonth = !(item.payments && item.payments[periodKey]);
        return isNotPaidOff && isNotPaidThisMonth;
    });
    const pendingInstallmentsCount = pendingInstallmentsThisMonth.length;
    const pendingInstallmentsAmount = pendingInstallmentsThisMonth.reduce((sum, item) => {
        const monthlyPayment = item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0;
        return sum + monthlyPayment;
    }, 0);

    document.getElementById('pendingInstallmentsCount').textContent = pendingInstallmentsCount;
    document.getElementById('pendingInstallmentsAmount').textContent = formatCurrency(pendingInstallmentsAmount);

    // --- Lógica de Tarjeta de Crédito ---
    const creditCardInstallmentDebt = wallet.installments
        .filter(i => i.type === 'credit_card')
        .reduce((sum, item) => {
            const monthlyPayment = item.totalInstallments > 0 ? item.totalAmount / item.totalInstallments : 0;
            return sum + (monthlyPayment * (item.totalInstallments - item.paidInstallments));
    }, 0);

    const realCreditLimit = wallet.creditCardLimit - creditCardInstallmentDebt;
    document.getElementById('creditCardLimitInfo').innerHTML = `<span class="text-green-400">${formatCurrency(realCreditLimit)}</span> / ${formatCurrency(wallet.creditCardLimit)}`;
    
    const availableCreditAfterUsage = realCreditLimit - monthlyCreditExpenses;
    document.getElementById('usedCredit').textContent = formatCurrency(monthlyCreditExpenses);
    document.getElementById('availableCredit').textContent = formatCurrency(availableCreditAfterUsage);

    // --- Lógica de Conciliación Bancaria ---
    const appDebitBalance = totalIncome - monthlyDebitExpenses;
    document.getElementById('reconciliationAppDebitBalance').textContent = formatCurrency(appDebitBalance);
    
    const bankDebitBalanceInput = document.getElementById('bankDebitBalanceInput');
    bankDebitBalanceInput.value = wallet.bankDebitBalance ? new Intl.NumberFormat('es-CL').format(wallet.bankDebitBalance) : '';
    const debitDifference = appDebitBalance - (wallet.bankDebitBalance || 0);

    const debitDiffContainer = document.getElementById('reconciliationDebitDifference');
    const debitDiffAmountEl = document.getElementById('differenceDebitAmount');
    debitDiffAmountEl.textContent = formatCurrency(debitDifference);
    
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

    document.getElementById('reconciliationAppCreditBalance').textContent = formatCurrency(availableCreditAfterUsage);
    const bankCreditBalanceInput = document.getElementById('bankCreditBalanceInput');
    bankCreditBalanceInput.value = wallet.bankCreditBalance ? new Intl.NumberFormat('es-CL').format(wallet.bankCreditBalance) : '';
    const creditDifference = availableCreditAfterUsage - (wallet.bankCreditBalance || 0);

    const creditDiffContainer = document.getElementById('reconciliationCreditDifference');
    const creditDiffAmountEl = document.getElementById('differenceCreditAmount');
    creditDiffAmountEl.textContent = formatCurrency(creditDifference);

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

    // --- Lógica de Comparación Mensual ---
    const comparisonContainer = document.getElementById('monthlyComparisonContainer');
    comparisonContainer.innerHTML = ''; 
    const budgetedCategories = Object.keys(wallet.budgets || {});

    if (budgetedCategories.length === 0) {
        comparisonContainer.innerHTML = `<p class="text-sm text-gray-400">No hay presupuestos definidos para comparar.</p>`;
    } else {
        const calculateTotals = (txs) => {
            return txs.filter(t => t.type.startsWith('expense')).reduce((acc, tx) => {
                if (!acc[tx.category]) acc[tx.category] = 0;
                acc[tx.category] += tx.amount;
                return acc;
            }, {});
        };
        
        const currentMonthTotals = calculateTotals(monthlyTransactions);
        const previousMonthTotals = calculateTotals(wallet.previousMonthTransactions);

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
    const chartContainer = document.getElementById('chartContainer');
    const transactionListContainer = document.getElementById('categoryTransactionList');
    const ctx = document.getElementById('categoryPieChart').getContext('2d');
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;

    const chartTitleEl = document.getElementById('categoryChartTitle');
    const backBtn = document.getElementById('backToCategoriesBtn');

    const monthlyTransactions = currentWallet.transactions.filter(t => {
        const [year, month] = t.date.split('-').map(Number);
        return month - 1 === state.selectedMonth && year === state.selectedYear;
    });
    
    const expenses = monthlyTransactions
        .filter(t => t.type.startsWith('expense') && t.category !== '[Pago de Deuda]');
    
    if (state.categoryChart) {
        state.categoryChart.destroy();
    }

    if (state.currentChartView === 'transactions') {
        chartContainer.classList.add('hidden');
        transactionListContainer.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        chartTitleEl.textContent = `Movimientos en: ${state.selectedSubcategoryForDrilldown}`;

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
                            <p class="font-medium text-white">${tx.description}</p>
                            <p class="text-xs text-gray-400">${formatYmdToDmy(tx.date)}</p>
                        </div>
                        <p class="font-semibold text-red-400">${formatCurrency(tx.amount)}</p>
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

    chartContainer.classList.remove('hidden');
    transactionListContainer.classList.add('hidden');
    
    let labels = [];
    let data = [];
    
    if (state.currentChartView === 'subcategories' && state.selectedCategoryForDrilldown) {
        chartTitleEl.textContent = `Desglose de: ${state.selectedCategoryForDrilldown}`;
        backBtn.classList.remove('hidden');

        const subcategoryExpenses = expenses
            .filter(t => t.category === state.selectedCategoryForDrilldown)
            .reduce((acc, tx) => {
                const sub = tx.subcategory || 'Sin Subcategoría';
                if (!acc[sub]) acc[sub] = 0;
                acc[sub] += tx.amount;
                return acc;
            }, {});
        
        labels = Object.keys(subcategoryExpenses);
        data = Object.values(subcategoryExpenses);

    } else { // Default 'categories' view
        chartTitleEl.textContent = 'Análisis de Gastos por Categoría';
        backBtn.classList.add('hidden');

        const byCategory = expenses.reduce((acc, tx) => {
            if (!acc[tx.category]) acc[tx.category] = 0;
            acc[tx.category] += tx.amount;
            return acc;
        }, {});
        
        labels = Object.keys(byCategory);
        data = Object.values(byCategory);
    }

    const newChart = new Chart(ctx, {
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
                if (elements.length > 0) {
                    const dataIndex = elements[0].index;
                    
                    if (state.currentChartView === 'categories') {
                        const category = newChart.data.labels[dataIndex];
                        const subcategoriesWithSpending = expenses.some(t => t.category === category && t.subcategory);

                        if (subcategoriesWithSpending) {
                            state.setCurrentChartView('subcategories');
                            state.setSelectedCategoryForDrilldown(category);
                            renderCategorySpending();
                        }
                    } else if (state.currentChartView === 'subcategories') {
                        const subcategory = newChart.data.labels[dataIndex];
                        state.setCurrentChartView('transactions');
                        state.setSelectedSubcategoryForDrilldown(subcategory);
                        renderCategorySpending();
                    }
                }
            }
        }
    });
    state.setCategoryChart(newChart);
};
// --- Modal and Dropdown Functions ---


let confirmationCallback = null;
export const showConfirmationModal = (message, callback) => {
    document.getElementById('confirmationModalMessage').textContent = message;
    const modal = document.getElementById('confirmationModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    confirmationCallback = callback;
};

export const hideConfirmationModal = () => {
    const modal = document.getElementById('confirmationModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    confirmationCallback = null;
};

document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmActionBtn');
    const cancelBtn = document.getElementById('cancelConfirmationBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (confirmationCallback) confirmationCallback();
            hideConfirmationModal();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideConfirmationModal);
    }
});

export const displayInputModal = (title, placeholder) => {
    document.getElementById('inputModalTitle').textContent = title;
    const inputField = document.getElementById('inputModalField');
    inputField.placeholder = placeholder;
    inputField.value = '';
    const modal = document.getElementById('inputModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    inputField.focus();
};

export const hideInputModal = () => {
    const modal = document.getElementById('inputModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

export const populateCategoryDropdown = (transactionType) => {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    const selectedValue = categorySelect.value;
    categorySelect.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;

    let categories = Object.keys(currentWallet.transactionCategories)
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
    const subcategorySelect = document.getElementById('subcategory');
    const subcategoryLabel = document.querySelector('label[for="subcategory"]');
    const addSubcategoryBtn = document.getElementById('addSubcategoryBtn');
    if (!subcategorySelect || !subcategoryLabel || !addSubcategoryBtn) return;
    
    subcategorySelect.innerHTML = '';
    const currentWallet = state.getCurrentWallet();
    
    if (!currentWallet || !currentWallet.transactionCategories[selectedCategory] || selectedCategory === 'Ingresos' || selectedCategory === '[Pago de Deuda]') {
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

    const subcategories = currentWallet.transactionCategories[selectedCategory];
    
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
    const categoryFilterSelect = document.getElementById('transactionCategoryFilter');
    if (!categoryFilterSelect) return;
    
    const currentWallet = state.getCurrentWallet();
    if (!currentWallet) return;
    
    const savedValue = categoryFilterSelect.value;
    categoryFilterSelect.innerHTML = '';
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todas las categorías';
    categoryFilterSelect.appendChild(allOption);

    const monthlyTransactions = currentWallet.transactions.filter(t => {
        const [year, month] = t.date.split('-').map(Number);
        return month - 1 === state.selectedMonth && year === state.selectedYear;
    });

    const categoriesInTable = [...new Set(monthlyTransactions.map(tx => tx.category))];
    
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
    const tabButtons = [
        document.getElementById('dashboardTabBtn'),
        document.getElementById('transactionsTabBtn'),
        document.getElementById('incomeAndBudgetsTabBtn'),
        document.getElementById('aiAnalysisTabBtn'),
        document.getElementById('settingsTabBtn')
    ];
    const contentPanels = [
        document.getElementById('dashboardContent'),
        document.getElementById('transactionsContent'),
        document.getElementById('incomeAndBudgetsContent'),
        document.getElementById('aiAnalysisContent'),
        document.getElementById('settingsContent')
    ];

    tabButtons.forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('tab-inactive');
    });
    activeBtn.classList.remove('tab-inactive');
    activeBtn.classList.add('tab-active');

    contentPanels.forEach(content => {
        content.classList.add('hidden');
    });
    
    if (activeBtn.id === 'dashboardTabBtn') {
        document.getElementById('dashboardContent').classList.remove('hidden');
        updateDashboard();
        renderCategorySpending();
    } else if (activeBtn.id === 'transactionsTabBtn') {
        document.getElementById('transactionsContent').classList.remove('hidden');
        renderTransactions(); 
    } else if (activeBtn.id === 'incomeAndBudgetsTabBtn') {
        document.getElementById('incomeAndBudgetsContent').classList.remove('hidden');
        renderFixedIncomes();
        renderInstallments();
        renderBudgets();
    } else if (activeBtn.id === 'aiAnalysisTabBtn') {
        document.getElementById('aiAnalysisContent').classList.remove('hidden');
    } else if (activeBtn.id === 'settingsTabBtn') {
        document.getElementById('settingsContent').classList.remove('hidden');
        renderSettings();
    }
};

export const setActiveCashflowTab = (activeBtn) => {
    const tabButtons = [
        document.getElementById('cashflowTabResume'),
        document.getElementById('cashflowTabIncome'),
        document.getElementById('cashflowTabExpenses')
    ];
    const contentPanels = [
        document.getElementById('cashflowContentResume'),
        document.getElementById('cashflowContentIncome'),
        document.getElementById('cashflowContentExpenses')
    ];

    tabButtons.forEach(btn => {
        btn.classList.remove('cashflow-tab-active');
        btn.classList.add('cashflow-tab-inactive');
    });
    activeBtn.classList.remove('cashflow-tab-inactive');
    activeBtn.classList.add('cashflow-tab-active');

    contentPanels.forEach(content => {
        content.classList.add('hidden');
    });

    if (activeBtn.id === 'cashflowTabResume') {
        document.getElementById('cashflowContentResume').classList.remove('hidden');
    } else if (activeBtn.id === 'cashflowTabIncome') {
        document.getElementById('cashflowContentIncome').classList.remove('hidden');
    } else if (activeBtn.id === 'cashflowTabExpenses') {
        document.getElementById('cashflowContentExpenses').classList.remove('hidden');
    }
};

// --- API and Analysis Functions ---

export const fetchEconomicIndicators = async (isInitialLoad = false) => {
    const usdPromise = fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.ok ? res.json() : Promise.reject('USD API response not OK'));
    const ufPromise = fetch('https://mindicador.cl/api/uf')
        .then(res => res.ok ? res.json() : Promise.reject('UF API response not OK'));

    const [usdResult, ufResult] = await Promise.allSettled([usdPromise, ufPromise]);
    let rates = state.exchangeRates;

    if (usdResult.status === 'fulfilled') {
        const data = usdResult.value;
        rates.USD = data.rates.CLP || 950;
        rates.lastUpdated = data.time_last_update_utc || null;
    } else {
        console.error('Failed to fetch exchange rates, using fallback:', usdResult.reason);
    }

    if (ufResult.status === 'fulfilled') {
        const data = ufResult.value;
        if (data.serie && data.serie.length > 0) {
            rates.UF = data.serie[0].valor || 0;
        }
    } else {
        console.error('Failed to fetch UF value:', ufResult.reason);
    }
    
    state.setExchangeRates(rates);

    if (!isInitialLoad) {
        saveDataToFirestore();
    }
    renderAll();
};

async function callGeminiAPI(userQuery) {
    const systemPrompt = "Actúa como un asesor financiero personal en Chile. Eres amigable, alentador y das consejos prácticos. Tu objetivo es ayudar al usuario a mejorar su salud financiera. Responde de forma concisa y estructurada. Nunca recomiendes el uso de otras aplicaciones o herramientas financieras externas.";
    const apiKey = state.geminiApiKey || "";
    // NOTA: El modelo de Gemini puede cambiar. Verifica la documentación para el más reciente, ej: "gemini-1.5-flash"
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    if (!apiKey) {
        throw new Error("API key for Gemini is not set.");
    }

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
        const errorBody = await response.json();
        console.error("API Error Body:", errorBody);
        throw new Error(`API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error("Invalid response structure from Gemini API.");
    }
    return candidate.content.parts[0].text || null;
}


export const runFullAiAnalysis = async () => {
    const btn = document.getElementById('runAiAnalysisBtn');
    const loader = document.getElementById('aiAnalysisLoader');
    const resultContainer = document.getElementById('aiAnalysisResult');
    const actionsContainer = document.getElementById('aiAnalysisActions');
    const wallet = state.getCurrentWallet();
    if (!wallet) return;

    btn.disabled = true;
    loader.classList.remove('hidden');
    resultContainer.innerHTML = '';
    actionsContainer.classList.add('hidden');

    try {
        const monthlyTransactions = wallet.transactions.filter(t => {
            const [year, month] = t.date.split('-').map(Number);
            return month - 1 === state.selectedMonth && year === state.selectedYear;
        });

        if (monthlyTransactions.length === 0) {
            resultContainer.innerHTML = `<p class="text-yellow-400">No hay datos suficientes en el período seleccionado para realizar un análisis.</p>`;
            return;
        }

        const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpensesList = monthlyTransactions.filter(t => t.type.startsWith('expense'));
        const totalMonthlyExpenses = monthlyExpensesList.reduce((sum, t) => sum + t.amount, 0);
        const expensesByCategory = monthlyExpensesList.reduce((acc, tx) => {
            if (!acc[tx.category]) acc[tx.category] = 0;
            acc[tx.category] += tx.amount; return acc; }, {});

        const financialData = `
            - Ingreso Total: ${formatCurrency(monthlyIncome)}
            - Gasto Total: ${formatCurrency(totalMonthlyExpenses)}
            - Gastos por Categoría: ${JSON.stringify(Object.fromEntries(Object.entries(expensesByCategory).map(([k, v]) => [k, formatCurrency(v)])))}
            - Deuda en Tarjeta de Crédito (solo cuotas): ${formatCurrency(wallet.installments.filter(i => i.type === 'credit_card').reduce((s, i) => s + (i.totalAmount / i.totalInstallments) * (i.totalInstallments - i.paidInstallments), 0))}
        `;

        const prompt = `
            Actúa como un consultor financiero experto, analizando los datos de un cliente. Tu tono debe ser profesional, alentador y orientado a la acción, como se esperaría de un consultor de EY.
            Proporciona un análisis financiero para el período actual basado en los siguientes datos. Estructura tu respuesta utilizando EXCLUSIVAMENTE los siguientes títulos en negrita:

            **Diagnóstico Financiero General:**
            (Evalúa la salud financiera general del mes. Compara ingresos vs. gastos. Otorga una calificación general: "Sólida", "Mejorable" o "Crítica").

            **Puntos Destacados del Mes:**
            (Identifica 2-3 aspectos positivos. Por ejemplo, si una categoría de gasto variable se mantuvo bajo control, o si el ingreso superó las expectativas).

            **Áreas de Oportunidad:**
            (Identifica las 2 categorías de gasto más altas y analiza su impacto en el presupuesto. Menciona si parecen gastos esenciales o discrecionales y su potencial de optimización).

            **Plan de Acción Sugerido:**
            (Proporciona 3 recomendaciones claras, accionables y priorizadas en formato de lista numerada. Deben ser específicas, como "1. Reducir el gasto en 'Restaurante' en un 20% el próximo mes, lo que equivale a un ahorro de X." o "2. Automatizar un traspaso de Y a tu cuenta el primer día del mes.").
            
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
        console.error("Error en el análisis de IA:", error);
        resultContainer.innerHTML = `<p class="text-red-400">Hubo un error al generar el análisis. Verifica que tu clave de API de Gemini esté guardada en Ajustes o inténtalo más tarde.</p>`;
    } finally {
        loader.classList.add('hidden');
        btn.disabled = false;
    }
};
export const generateAnalysisPDF = () => {
    // jsPDF está disponible globalmente desde el script en index.html
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const resultContainer = document.getElementById('aiAnalysisResult');
    if (!resultContainer.hasChildNodes()) {
        console.error("No hay análisis para exportar.");
        return;
    }

    const wallet = state.getCurrentWallet();
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const period = `${months[state.selectedMonth]} ${state.selectedYear}`;
    const walletName = wallet ? wallet.name : 'Desconocida';
    
    const pageMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (pageMargin * 2);
    let cursorY = pageMargin;

    // --- Título del Documento ---
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
    
    // --- Contenido del Análisis ---
    doc.setTextColor(0);
    const nodes = resultContainer.childNodes;

    nodes.forEach(node => {
        if (cursorY > doc.internal.pageSize.getHeight() - 20) { // Margen inferior
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
                const splitText = doc.splitTextToSize(itemText, contentWidth - 5); // Indentación para la lista
                
                if (cursorY + (splitText.length * 5) > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    cursorY = pageMargin;
                }
                
                doc.text(splitText, pageMargin + 5, cursorY);
                cursorY += (splitText.length * 5) + 2;
            });
        }
    });

    // --- Paginación ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Analisis_Financiero_${walletName}_${period.replace(' ', '_')}.pdf`);
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

    showInputModal(`Editar Categoría`, `Nuevo nombre para "${oldName}"`, async (newName) => {
        if (!newName || newName.trim() === '' || newName === oldName) return;
        newName = newName.trim();
        if (wallet.transactionCategories[newName]) {
            alert(`La categoría "${newName}" ya existe.`);
            return;
        }
        wallet.transactionCategories[newName] = wallet.transactionCategories[oldName];
        delete wallet.transactionCategories[oldName];
        if (wallet.budgets[oldName]) {
            wallet.budgets[newName] = wallet.budgets[oldName];
            delete wallet.budgets[oldName];
        }
        wallet.transactions.forEach(tx => { if (tx.category === oldName) tx.category = newName; });
        wallet.previousMonthTransactions.forEach(tx => { if (tx.category === oldName) tx.category = newName; });
        await updateDataInFirestore();
    });
};

export const handleEditSubcategory = (categoryName, oldName) => {
    const wallet = state.getCurrentWallet();
    if (!wallet || !wallet.transactionCategories[categoryName]) return;

    showInputModal(`Editar Subcategoría en "${categoryName}"`, `Nuevo nombre para "${oldName}"`, async (newName) => {
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
        if (wallet.budgets[categoryName]?.subcategories[oldName] !== undefined) {
            wallet.budgets[categoryName].subcategories[newName] = wallet.budgets[categoryName].subcategories[oldName];
            delete wallet.budgets[categoryName].subcategories[oldName];
        }
        wallet.transactions.forEach(tx => { if (tx.category === categoryName && tx.subcategory === oldName) tx.subcategory = newName; });
        wallet.previousMonthTransactions.forEach(tx => { if (tx.category === categoryName && tx.subcategory === oldName) tx.subcategory = newName; });
        await updateDataInFirestore();
    });
};
