// handlers.js (Versión Final Corregida y Completa)
// Cleaned: removed duplicate listeners, small defensive fixes.

import * as state from './state.js';
import * as ui from './ui.js';
import { updateDataInFirestore, saveDataToFirestore } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

let currentConfirmAction = null;
let currentInputConfirmAction = null;

// --- Funciones Controladoras Locales ---
// Use whichever UI helper exists to show/hide modals (be tolerant to naming)
function showConfirmationModal(message, onConfirm) {
    currentConfirmAction = onConfirm;
    if (typeof ui.showConfirmationModal === 'function') {
        ui.showConfirmationModal(message);
    } else if (typeof ui.displayConfirmationModal === 'function') {
        ui.displayConfirmationModal(message);
    } else {
        // Fallback: confirm() — last resort, synchronous
        if (confirm(message)) onConfirm && onConfirm();
    }
}

function showInputModal(title, placeholder, onSave) {
    currentInputConfirmAction = onSave;
    if (typeof ui.showInputModal === 'function') {
        ui.showInputModal(title, placeholder);
    } else if (typeof ui.displayInputModal === 'function') {
        ui.displayInputModal(title, placeholder);
    } else {
        // Fallback: prompt() synchronous
        const val = prompt(title, '');
        if (val !== null && val.trim() !== '') onSave && onSave(val.trim());
    }
}

export function initializeEventListeners() {
    
    // --- Autenticación ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            if (errorEl) errorEl.textContent = '';
            try {
                await signInWithEmailAndPassword(state.auth, email, password);
            } catch (error) {
                if (errorEl) errorEl.textContent = "Email o contraseña incorrectos.";
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const errorEl = document.getElementById('registerError');
            if (errorEl) errorEl.textContent = '';
            try {
                await createUserWithEmailAndPassword(state.auth, email, password);
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') { if (errorEl) errorEl.textContent = "El email ya está registrado."; } 
                else if (error.code === 'auth/weak-password') { if (errorEl) errorEl.textContent = "La contraseña debe tener al menos 6 caracteres."; } 
                else { if (errorEl) errorEl.textContent = "Error al registrar la cuenta."; }
            }
        });
    }

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Por favor, ingresa el email de la cuenta para recuperar la contraseña:");
            if (email) {
                const errorEl = document.getElementById('loginError');
                sendPasswordResetEmail(state.auth, email)
                    .then(() => {
                        if (errorEl) {
                            errorEl.textContent = 'Si el email está registrado, recibirás un enlace.';
                            errorEl.classList.remove('text-red-400');
                            errorEl.classList.add('text-green-400');
                        }
                    })
                    .catch(() => { if (errorEl) errorEl.textContent = 'No se pudo enviar el correo. Inténtalo de nuevo.'; });
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(state.auth).catch(error => console.error("Logout failed:", error));
        });
    }

    // --- Navegación ---
    const navMapping = [
        ['dashboardTabBtn'],
        ['transactionsTabBtn'],
        ['incomeAndBudgetsTabBtn'],
        ['aiAnalysisTabBtn'],
        ['settingsTabBtn']
    ];
    navMapping.forEach(([id]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => ui.setActiveTab(el));
    });

    const cashflowTabs = ['cashflowTabResume', 'cashflowTabIncome', 'cashflowTabExpenses'];
    cashflowTabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => ui.setActiveCashflowTab(el));
    });

    // --- Filtros Globales ---
    const walletSelector = document.getElementById('walletSelector');
    if (walletSelector) {
        walletSelector.addEventListener('change', (e) => {
            state.setCurrentWalletId(parseInt(e.target.value));
            saveDataToFirestore();
            ui.renderAll();
        });
    }

    const yearSelector = document.getElementById('yearSelector');
    if (yearSelector) {
        yearSelector.addEventListener('change', (e) => {
            state.setSelectedYear(parseInt(e.target.value));
            ui.initializeDateSelectors();
            ui.renderAll();
        });
    }

    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
        monthSelector.addEventListener('change', (e) => {
            state.setSelectedMonth(parseInt(e.target.value));
            ui.renderAll();
        });
    }
    
    // --- Dashboard ---
    const backToCategoriesBtn = document.getElementById('backToCategoriesBtn');
    if (backToCategoriesBtn) {
        backToCategoriesBtn.addEventListener('click', () => {
            if (state.currentChartView === 'transactions') {
                state.setCurrentChartView('subcategories');
                state.setSelectedSubcategoryForDrilldown(null);
            } else if (state.currentChartView === 'subcategories') {
                state.setCurrentChartView('categories');
                state.setSelectedCategoryForDrilldown(null);
            }
            ui.renderCategorySpending();
        });
    }

    const previousMonthSurplusInput = document.getElementById('previousMonthSurplusInput');
    if (previousMonthSurplusInput) {
        previousMonthSurplusInput.addEventListener('change', (e) => {
            const wallet = state.getCurrentWallet();
            if(wallet) {
                if (!wallet.manualSurplus) wallet.manualSurplus = {};
                const surplusKey = `${state.selectedYear}-${state.selectedMonth}`;
                wallet.manualSurplus[surplusKey] = ui.getNumericValue(e.target.value) || 0;
                saveDataToFirestore();
            }
        });
    }

    const bankDebitBalanceInput = document.getElementById('bankDebitBalanceInput');
    if (bankDebitBalanceInput) {
        bankDebitBalanceInput.addEventListener('input', (e) => {
            const wallet = state.getCurrentWallet();
            if(wallet) {
                wallet.bankDebitBalance = ui.getNumericValue(e.target.value) || 0;
                saveDataToFirestore(true);
                ui.updateDashboard();
            }
        });
    }
    
    const bankCreditBalanceInput = document.getElementById('bankCreditBalanceInput');
    if (bankCreditBalanceInput) {
        bankCreditBalanceInput.addEventListener('input', (e) => {
            const wallet = state.getCurrentWallet();
            if(wallet) {
                wallet.bankCreditBalance = ui.getNumericValue(e.target.value) || 0;
                saveDataToFirestore(true);
                ui.updateDashboard();
            }
        });
    }

    // --- Pestaña Movimientos y su Modal ---
    const transactionModal = document.getElementById('transactionModal');
    const transactionForm = document.getElementById('transactionForm');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const handleTransactionTypeChange = () => {
        const typeSelect = document.getElementById('type');
        const categorySelect = document.getElementById('category');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (!typeSelect || !categorySelect || !addCategoryBtn) return;
        const currentCategory = categorySelect.value;
        ui.populateCategoryDropdown(typeSelect.value);
        if (typeSelect.value === 'income') {
            categorySelect.value = 'Ingresos';
            categorySelect.disabled = true;
            addCategoryBtn.disabled = true;
            addCategoryBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            categorySelect.disabled = false;
            addCategoryBtn.disabled = false;
            addCategoryBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            const cw = state.getCurrentWallet();
            if (cw) {
                if (currentCategory === 'Ingresos' || !categorySelect.value) {
                    const firstExpenseCategory = Object.keys(cw.transactionCategories).find(c => c !== 'Ingresos' && c !== '[Pago de Deuda]');
                    if (firstExpenseCategory) categorySelect.value = firstExpenseCategory;
                }
            }
        }
        ui.populateSubcategoryDropdown(categorySelect.value);
    };

    if (addTransactionBtn && transactionModal && transactionForm) {
        addTransactionBtn.addEventListener('click', () => {
            const titleEl = document.getElementById('transactionModalTitle');
            if (titleEl) titleEl.textContent = "Nuevo Movimiento";
            transactionForm.reset();
            const txIdEl = document.getElementById('transactionId');
            if (txIdEl) txIdEl.value = '';
            const dateEl = document.getElementById('date');
            if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
            handleTransactionTypeChange();
            transactionModal.classList.remove('hidden');
            transactionModal.classList.add('flex');
        });

        if (closeModalBtn) closeModalBtn.addEventListener('click', () => transactionModal.classList.add('hidden'));
        transactionModal.addEventListener('click', (e) => { if (e.target === transactionModal) transactionModal.classList.add('hidden'); });

        const typeEl = document.getElementById('type');
        if (typeEl) typeEl.addEventListener('change', handleTransactionTypeChange);
        const categoryEl = document.getElementById('category');
        if (categoryEl) categoryEl.addEventListener('change', () => ui.populateSubcategoryDropdown(categoryEl.value));

        const addCategoryBtnEl = document.getElementById('addCategoryBtn');
        if (addCategoryBtnEl) {
            addCategoryBtnEl.addEventListener('click', () => {
                showInputModal('Crear Nueva Categoría', 'Nombre de la categoría', (newCategory) => {
                    const wallet = state.getCurrentWallet();
                    if (newCategory && wallet && !wallet.transactionCategories[newCategory]) {
                        wallet.transactionCategories[newCategory] = [];
                        wallet.budgets[newCategory] = { total: null, type: 'variable', subcategories: {} };
                        updateDataInFirestore();
                        handleTransactionTypeChange();
                        const categorySelectEl = document.getElementById('category');
                        if (categorySelectEl) categorySelectEl.value = newCategory;
                    }
                });
            });
        }

        const addSubcategoryBtnEl = document.getElementById('addSubcategoryBtn');
        if (addSubcategoryBtnEl) {
            addSubcategoryBtnEl.addEventListener('click', () => {
                const currentCategory = document.getElementById('category')?.value;
                const wallet = state.getCurrentWallet();
                if (!currentCategory || currentCategory === 'Ingresos' || !wallet?.transactionCategories[currentCategory]) return;
                showInputModal(`Nueva Subcategoría para "${currentCategory}"`, 'Nombre de la subcategoría', (newSubcategory) => {
                    if (newSubcategory && !wallet.transactionCategories[currentCategory].includes(newSubcategory)) {
                        wallet.transactionCategories[currentCategory].push(newSubcategory);
                        updateDataInFirestore();
                        ui.populateSubcategoryDropdown(currentCategory, newSubcategory);
                    }
                });
            });
        }

        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('transactionId').value);
            const transactionData = {
                description: document.getElementById('description').value,
                amount: ui.getNumericValue(document.getElementById('amount').value),
                date: document.getElementById('date').value,
                type: document.getElementById('type').value,
                category: document.getElementById('category').value,
                subcategory: document.getElementById('subcategory').value || null
            };
            const wallet = state.getCurrentWallet();
            if (!wallet) return;
            if (id) {
                const index = wallet.transactions.findIndex(tx => tx.id === id);
                if (index !== -1) wallet.transactions[index] = { ...wallet.transactions[index], ...transactionData };
            } else {
                wallet.transactions.push({ id: Date.now(), ...transactionData });
            }
            await updateDataInFirestore();
            transactionModal.classList.add('hidden');
        });
    }

    // Filters (safe-guard active button swap)
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns && filterBtns.length) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const activeBtn = document.querySelector('.filter-btn.bg-indigo-600');
                if (activeBtn) activeBtn.classList.replace('bg-indigo-600', 'bg-gray-600');
                btn.classList.replace('bg-gray-600', 'bg-indigo-600');
                state.setCurrentFilter(btn.dataset.filter);
                ui.renderTransactions();
            });
        });
    }

    const transactionCategoryFilter = document.getElementById('transactionCategoryFilter');
    if (transactionCategoryFilter) {
        transactionCategoryFilter.addEventListener('change', e => {
            state.setFilterCategory(e.target.value);
            ui.renderTransactions();
        });
    }

    const transactionTableHeader = document.getElementById('transaction-table-header');
    if (transactionTableHeader) {
        transactionTableHeader.addEventListener('click', e => {
            const header = e.target.closest('th[data-sort]');
            if (!header) return;
            const column = header.dataset.sort;
            if (state.sortColumn === column) {
                state.setSortDirection(state.sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                state.setSortColumn(column);
                state.setSortDirection('asc');
            }
            ui.renderTransactions();
        });
    }

    // --- Pestaña Presupuestos y Cuotas ---
    const incomeAndBudgetsContent = document.getElementById('incomeAndBudgetsContent');
    if (incomeAndBudgetsContent) {
        incomeAndBudgetsContent.addEventListener('click', async (e) => {
            const wallet = state.getCurrentWallet();
            if (!wallet) return;

            const handleAction = async (action) => {
                action();
                await updateDataInFirestore();
            };

            const toggleBtn = e.target.closest('.category-toggle-btn');
            if (toggleBtn) {
                const targetId = toggleBtn.dataset.target;
                const wrapper = document.getElementById(targetId);
                const icon = toggleBtn.querySelector('i');
                if (wrapper) {
                    wrapper.classList.toggle('hidden');
                    icon?.classList.toggle('rotate-180');
                }
                return;
            }

            const addRecurrentBtn = e.target.closest('#addRecurrentCategoryBtn');
            if (addRecurrentBtn) {
                const input = document.getElementById('newRecurrentCategoryInput');
                const newCategory = input?.value.trim();
                if (newCategory && !wallet.transactionCategories[newCategory]) {
                    await handleAction(() => {
                        wallet.transactionCategories[newCategory] = [];
                        wallet.budgets[newCategory] = { total: null, type: 'recurrent', subcategories: {}, payments: {} };
                        if (input) input.value = '';
                    });
                }
                return;
            }
            
            const addVariableBtn = e.target.closest('#addVariableCategoryBtn');
            if (addVariableBtn) {
                const input = document.getElementById('newVariableCategoryInput');
                const newCategory = input?.value.trim();
                if (newCategory && !wallet.transactionCategories[newCategory]) {
                    await handleAction(() => {
                        wallet.transactionCategories[newCategory] = [];
                        wallet.budgets[newCategory] = { total: null, type: 'variable', subcategories: {} };
                        if (input) input.value = '';
                    });
                }
                return;
            }
            
            const editCategoryBtn = e.target.closest('.edit-category-btn');
            if (editCategoryBtn) { ui.handleEditCategory(editCategoryBtn.dataset.category); return; }

            const deleteCategoryBtn = e.target.closest('.delete-category-btn');
            if (deleteCategoryBtn) {
                const category = deleteCategoryBtn.dataset.category;
                showConfirmationModal(`¿Seguro que quieres eliminar la categoría "${category}"?`, async () => {
                    await handleAction(() => {
                        delete wallet.transactionCategories[category];
                        delete wallet.budgets[category];
                    });
                });
                return;
            }
            
            const editSubcategoryBtn = e.target.closest('.edit-subcategory-btn');
            if (editSubcategoryBtn) { ui.handleEditSubcategory(editSubcategoryBtn.dataset.category, editSubcategoryBtn.dataset.subcategory); return; }

            const deleteSubcategoryBtn = e.target.closest('.delete-subcategory-btn');
            if (deleteSubcategoryBtn) {
                const { category, subcategory } = deleteSubcategoryBtn.dataset;
                showConfirmationModal(`¿Seguro que quieres eliminar la subcategoría "${subcategory}"?`, async () => {
                    await handleAction(() => {
                        wallet.transactionCategories[category] = wallet.transactionCategories[category].filter(s => s !== subcategory);
                        delete wallet.budgets[category].subcategories[subcategory];
                    });
                });
                return;
            }

            const addSubcategoryBtn = e.target.closest('.add-subcategory-btn');
            if (addSubcategoryBtn) {
                const category = addSubcategoryBtn.dataset.category;
                const input = addSubcategoryBtn.previousElementSibling;
                const newSubcategory = input?.value.trim();
                if (newSubcategory && !wallet.transactionCategories[category].includes(newSubcategory)) {
                    await handleAction(() => {
                        wallet.transactionCategories[category].push(newSubcategory);
                        if (input) input.value = '';
                    });
                }
                return;
            }

            // Fixed incomes
            const editFixedIncomeBtn = e.target.closest('.edit-fixed-income-btn');
            if (editFixedIncomeBtn) {
                const id = parseInt(editFixedIncomeBtn.dataset.id);
                const income = wallet.fixedIncomes.find(fi => fi.id === id);
                if (income) {
                    const titleEl = document.getElementById('fixedIncomeModalTitle');
                    if (titleEl) titleEl.textContent = "Editar Ingreso Fijo";
                    document.getElementById('fixedIncomeId').value = income.id;
                    document.getElementById('fixedIncomeDescription').value = income.description;
                    document.getElementById('fixedIncomeExpectedAmount').value = income.expectedAmount;
                    document.getElementById('fixedIncomeModal').classList.remove('hidden');
                }
                return;
            }

            const deleteFixedIncomeBtn = e.target.closest('.delete-fixed-income-btn');
            if (deleteFixedIncomeBtn) {
                const id = parseInt(deleteFixedIncomeBtn.dataset.id);
                const income = wallet.fixedIncomes.find(fi => fi.id === id);
                if (!income) return;
                showConfirmationModal(`¿Seguro que quieres eliminar el ingreso fijo "${income.description}"?`, async () => {
                    await handleAction(() => {
                        wallet.fixedIncomes = wallet.fixedIncomes.filter(fi => fi.id !== id);
                    });
                });
                return;
            }

            // Installments actions
            const unpayInstallmentBtn = e.target.closest('.unpay-installment-btn');
            if (unpayInstallmentBtn) {
                const id = parseInt(unpayInstallmentBtn.dataset.id);
                await handleAction(() => {
                    const item = wallet.installments.find(i => i.id === id);
                    if (item && item.paidInstallments > 0) item.paidInstallments--;
                });
                return;
            }

            const payInstallmentBtn = e.target.closest('.pay-installment-btn');
            if (payInstallmentBtn) {
                const id = parseInt(payInstallmentBtn.dataset.id);
                await handleAction(() => {
                    const item = wallet.installments.find(i => i.id === id);
                    if (item && item.paidInstallments < item.totalInstallments) item.paidInstallments++;
                });
                return;
            }

            const editInstallmentBtn = e.target.closest('.edit-installment-btn');
            if (editInstallmentBtn) {
                const id = parseInt(editInstallmentBtn.dataset.id);
                const item = wallet.installments.find(i => i.id === id);
                if(item) {
                    const titleEl = document.getElementById('installmentModalTitle');
                    if (titleEl) titleEl.textContent = "Editar Compra o Crédito";
                    document.getElementById('installmentId').value = item.id;
                    document.getElementById('installmentDescription').value = item.description;
                    document.getElementById('installmentTotalAmount').value = item.totalAmount;
                    document.getElementById('installmentTotal').value = item.totalInstallments;
                    document.getElementById('installmentType').value = item.type;
                    document.getElementById('installmentModal').classList.remove('hidden');
                }
                return;
            }
            
            const deleteInstallmentBtn = e.target.closest('.delete-installment-btn');
            if (deleteInstallmentBtn) {
                const id = parseInt(deleteInstallmentBtn.dataset.id);
                const installment = wallet.installments.find(i => i.id === id);
                if (!installment) return;
                showConfirmationModal(`¿Seguro que quieres eliminar la compra "${installment.description}"?`, async () => {
                    await handleAction(() => {
                        wallet.installments = wallet.installments.filter(i => i.id !== id);
                    });
                });
                return;
            }
        });
    }

    // Note: there was a second incomeAndBudgetsContent listener in the original file.
    // It was removed and merged above to avoid duplicate handling.

    incomeAndBudgetsContent?.addEventListener('change', async (e) => {
        const wallet = state.getCurrentWallet();
        if (!wallet) return;
        const periodKey = `${state.selectedYear}-${state.selectedMonth + 1}`;

        if (e.target.matches('.fixed-income-real-amount, .fixed-income-received-toggle')) {
            const id = parseInt(e.target.dataset.id);
            const income = wallet.fixedIncomes.find(i => i.id === id);
            if (!income) return;

            const row = e.target.closest('.p-4');
            const amountInput = row.querySelector('.fixed-income-real-amount');
            const receivedToggle = row.querySelector('.fixed-income-received-toggle');
            
            const realAmount = ui.getNumericValue(amountInput.value);
            const isReceived = receivedToggle.checked;
            
            if (!income.payments) income.payments = {};
            if (!income.payments[periodKey]) income.payments[periodKey] = {};
            income.payments[periodKey].amount = realAmount;
            income.payments[periodKey].received = isReceived;
            
            const txIndex = wallet.transactions.findIndex(tx => tx.isFixedIncomePayment && tx.fixedIncomeId === id);
            if(isReceived && realAmount > 0) {
                const txData = {
                    description: income.description, amount: realAmount, date: new Date().toISOString().slice(0,10),
                    type: 'income', category: 'Ingresos', subcategory: null, isFixedIncomePayment: true, fixedIncomeId: income.id
                };
                if (txIndex > -1) wallet.transactions[txIndex] = { ...wallet.transactions[txIndex], ...txData };
                else wallet.transactions.push({ id: Date.now(), ...txData });
            } else {
                if (txIndex > -1) wallet.transactions.splice(txIndex, 1);
            }
            await updateDataInFirestore();
        }
    });

    const runAiAnalysisBtn = document.getElementById('runAiAnalysisBtn');
    if (runAiAnalysisBtn) runAiAnalysisBtn.addEventListener('click', ui.runFullAiAnalysis);
    const downloadAiAnalysisBtn = document.getElementById('downloadAiAnalysisBtn');
    if (downloadAiAnalysisBtn) downloadAiAnalysisBtn.addEventListener('click', ui.generateAnalysisPDF);

    const addWalletBtn = document.getElementById('addWalletBtn');
    if (addWalletBtn) {
        addWalletBtn.addEventListener('click', async () => {
            const input = document.getElementById('newWalletInput');
            const newName = input?.value.trim();
            if (newName) {
                const newWallet = {
                    id: Date.now(),
                    name: newName,
                    transactions: [], previousMonthTransactions: [], fixedIncomes: [], installments: [],
                    transactionCategories: { 'Ingresos': [], '[Pago de Deuda]': [], 'Compras': [], 'Cuentas': [], 'Otros': [] },
                    budgets: {}, creditCardLimit: 0, bankDebitBalance: 0, bankCreditBalance: 0, manualSurplus: {}
                };
                state.wallets.push(newWallet);
                state.setCurrentWalletId(newWallet.id);
                if (input) input.value = '';
                await updateDataInFirestore();
            }
        });
    }

    const walletList = document.getElementById('walletList');
    if (walletList) {
        walletList.addEventListener('click', (e) => {
            const walletId = parseInt(e.target.closest('[data-wallet-id]')?.dataset.walletId);
            if (!walletId) return;

            if (e.target.closest('.edit-wallet-btn')) {
                const wallet = state.wallets.find(w => w.id === walletId);
                const newName = prompt("Nuevo nombre para la billetera:", wallet.name);
                if (newName && newName.trim() !== '') {
                    wallet.name = newName.trim();
                    updateDataInFirestore();
                }
            }
            if (e.target.closest('.delete-wallet-btn')) {
                if (state.wallets.length <= 1) return;
                const wallet = state.wallets.find(w => w.id === walletId);
                showConfirmationModal(`¿Seguro que quieres eliminar la billetera "${wallet.name}"?`, async () => {
                    state.setWallets(state.wallets.filter(w => w.id !== walletId));
                    if (state.currentWalletId === walletId) {
                        state.setCurrentWalletId(state.wallets[0].id);
                    }
                    await updateDataInFirestore();
                });
            }
        });
    }

    const creditCardLimitInput = document.getElementById('creditCardLimitInput');
    if (creditCardLimitInput) {
        creditCardLimitInput.addEventListener('change', (e) => {
            const wallet = state.getCurrentWallet();
            if (wallet) {
                wallet.creditCardLimit = ui.getNumericValue(e.target.value) || 0;
                updateDataInFirestore();
            }
        });
    }
    
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', () => {
            const input = document.getElementById('geminiApiKeyInput');
            state.setGeminiApiKey(input?.value);
            updateDataInFirestore();
        });
    }
    
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', () => {
            if (currentConfirmAction) {
                currentConfirmAction();
            }
            if (typeof ui.hideConfirmationModal === 'function') ui.hideConfirmationModal();
            currentConfirmAction = null;
        });
    }

    const cancelConfirmationBtn = document.getElementById('cancelConfirmationBtn');
    if (cancelConfirmationBtn) cancelConfirmationBtn.addEventListener('click', () => { if (typeof ui.hideConfirmationModal === 'function') ui.hideConfirmationModal(); });
    const confirmationModal = document.getElementById('confirmationModal');
    if (confirmationModal) confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal && typeof ui.hideConfirmationModal === 'function') ui.hideConfirmationModal();
    });
    
    const inputModalForm = document.getElementById('inputModalForm');
    if (inputModalForm) {
        inputModalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (currentInputConfirmAction) {
                const value = document.getElementById('inputModalField').value;
                if (value && value.trim() !== '') {
                    currentInputConfirmAction(value.trim());
                }
            }
            if (typeof ui.hideInputModal === 'function') ui.hideInputModal();
        });
    }

    const cancelInputBtn = document.getElementById('cancelInputBtn');
    if (cancelInputBtn) cancelInputBtn.addEventListener('click', () => { if (typeof ui.hideInputModal === 'function') ui.hideInputModal(); });
    const inputModal = document.getElementById('inputModal');
    if (inputModal) inputModal.addEventListener('click', (e) => {
        if (e.target === inputModal && typeof ui.hideInputModal === 'function') ui.hideInputModal();
    });
}
