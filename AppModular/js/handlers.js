// handlers.js (Versión Final Corregida y Completa)

import * as state from './state.js';
import * as ui from './ui.js';
import { updateDataInFirestore, saveDataToFirestore } from './firebase.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

let currentConfirmAction = null;
let currentInputConfirmAction = null;

// --- Funciones Controladoras Locales ---
function showConfirmationModal(message, onConfirm) {
    currentConfirmAction = onConfirm;
    ui.displayConfirmationModal(message);
}

function showInputModal(title, placeholder, onSave) {
    currentInputConfirmAction = onSave;
    ui.displayInputModal(title, placeholder);
}

export function initializeEventListeners() {
    
    // --- Autenticación ---
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = '';
        try {
            await signInWithEmailAndPassword(state.auth, email, password);
        } catch (error) {
            errorEl.textContent = "Email o contraseña incorrectos.";
        }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const errorEl = document.getElementById('registerError');
        errorEl.textContent = '';
        try {
            await createUserWithEmailAndPassword(state.auth, email, password);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') { errorEl.textContent = "El email ya está registrado."; } 
            else if (error.code === 'auth/weak-password') { errorEl.textContent = "La contraseña debe tener al menos 6 caracteres."; } 
            else { errorEl.textContent = "Error al registrar la cuenta."; }
        }
    });

    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt("Por favor, ingresa el email de la cuenta para recuperar la contraseña:");
        if (email) {
            const errorEl = document.getElementById('loginError');
            sendPasswordResetEmail(state.auth, email)
                .then(() => {
                    errorEl.textContent = 'Si el email está registrado, recibirás un enlace.';
                    errorEl.classList.remove('text-red-400');
                    errorEl.classList.add('text-green-400');
                })
                .catch(() => { errorEl.textContent = 'No se pudo enviar el correo. Inténtalo de nuevo.'; });
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        signOut(state.auth).catch(error => console.error("Logout failed:", error));
    });

    // --- Navegación ---
    document.getElementById('dashboardTabBtn').addEventListener('click', () => ui.setActiveTab(document.getElementById('dashboardTabBtn')));
    document.getElementById('transactionsTabBtn').addEventListener('click', () => ui.setActiveTab(document.getElementById('transactionsTabBtn')));
    document.getElementById('incomeAndBudgetsTabBtn').addEventListener('click', () => ui.setActiveTab(document.getElementById('incomeAndBudgetsTabBtn')));
    document.getElementById('aiAnalysisTabBtn').addEventListener('click', () => ui.setActiveTab(document.getElementById('aiAnalysisTabBtn')));
    document.getElementById('settingsTabBtn').addEventListener('click', () => ui.setActiveTab(document.getElementById('settingsTabBtn')));

    document.getElementById('cashflowTabResume').addEventListener('click', () => ui.setActiveCashflowTab(document.getElementById('cashflowTabResume')));
    document.getElementById('cashflowTabIncome').addEventListener('click', () => ui.setActiveCashflowTab(document.getElementById('cashflowTabIncome')));
    document.getElementById('cashflowTabExpenses').addEventListener('click', () => ui.setActiveCashflowTab(document.getElementById('cashflowTabExpenses')));

    // Initialize modal handling
    const modals = document.querySelectorAll('.modal-backdrop');
    modals.forEach(modal => {
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });

        // Close on cancel button
        const cancelBtn = modal.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }

        // Close on X button
        const closeBtn = modal.querySelector('.close-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }
    });

    // --- Filtros Globales ---
    document.getElementById('walletSelector').addEventListener('change', (e) => {
        state.setCurrentWalletId(parseInt(e.target.value));
        saveDataToFirestore();
        ui.renderAll();
    });

    document.getElementById('yearSelector').addEventListener('change', (e) => {
        state.setSelectedYear(parseInt(e.target.value));
        ui.initializeDateSelectors();
        ui.renderAll();
    });

    document.getElementById('monthSelector').addEventListener('change', (e) => {
        state.setSelectedMonth(parseInt(e.target.value));
        ui.renderAll();
    });
    
    // --- Dashboard ---
    document.getElementById('backToCategoriesBtn').addEventListener('click', () => {
        if (state.currentChartView === 'transactions') {
            state.setCurrentChartView('subcategories');
            state.setSelectedSubcategoryForDrilldown(null);
        } else if (state.currentChartView === 'subcategories') {
            state.setCurrentChartView('categories');
            state.setSelectedCategoryForDrilldown(null);
        }
        ui.renderCategorySpending();
    });
    
    document.getElementById('previousMonthSurplusInput').addEventListener('change', (e) => {
        const wallet = state.getCurrentWallet();
        if(wallet) {
            if (!wallet.manualSurplus) wallet.manualSurplus = {};
            const surplusKey = `${state.selectedYear}-${state.selectedMonth}`;
            wallet.manualSurplus[surplusKey] = ui.getNumericValue(e.target.value) || 0;
            saveDataToFirestore();
        }
    });

    document.getElementById('bankDebitBalanceInput').addEventListener('input', (e) => {
        const wallet = state.getCurrentWallet();
        if(wallet) {
            wallet.bankDebitBalance = ui.getNumericValue(e.target.value) || 0;
            saveDataToFirestore(true);
            ui.updateDashboard();
        }
    });
    
    document.getElementById('bankCreditBalanceInput').addEventListener('input', (e) => {
        const wallet = state.getCurrentWallet();
        if(wallet) {
            wallet.bankCreditBalance = ui.getNumericValue(e.target.value) || 0;
            saveDataToFirestore(true);
            ui.updateDashboard();
        }
    });

    // --- Pestaña Movimientos y su Modal ---
    const transactionModal = document.getElementById('transactionModal');
    const transactionForm = document.getElementById('transactionForm');
    const transactionsTable = document.getElementById('transactionsTable');
    
    // --- Pestaña Presupuestos y Cuotas ---
    const fixedIncomeModal = document.getElementById('fixedIncomeModal');
    const fixedIncomeForm = document.getElementById('fixedIncomeForm');
    const installmentModal = document.getElementById('installmentModal');
    const installmentForm = document.getElementById('installmentForm');
    const incomeAndBudgetsContent = document.getElementById('incomeAndBudgetsContent');
    
    document.getElementById('addTransactionBtn').addEventListener('click', () => {
        document.getElementById('transactionModalTitle').textContent = "Nuevo Movimiento";
        transactionForm.reset();
        document.getElementById('transactionId').value = '';
        document.getElementById('date').value = new Date().toISOString().slice(0, 10);
        handleTransactionTypeChange();
        transactionModal.classList.remove('hidden');
        transactionModal.classList.add('flex');
    });

    // Manejador de eventos para los botones de editar y eliminar transacciones
    transactionsTable?.addEventListener('click', async (e) => {
        const wallet = state.getCurrentWallet();
        if (!wallet) return;

        const editBtn = e.target.closest('.edit-transaction-btn');
        if (editBtn) {
            const id = parseInt(editBtn.dataset.id);
            const transaction = wallet.transactions.find(tx => tx.id === id);
            if (transaction) {
                document.getElementById('transactionModalTitle').textContent = "Editar Movimiento";
                document.getElementById('transactionId').value = transaction.id;
                document.getElementById('description').value = transaction.description;
                document.getElementById('amount').value = transaction.amount;
                document.getElementById('date').value = transaction.date;
                document.getElementById('type').value = transaction.type;
                document.getElementById('category').value = transaction.category;
                handleTransactionTypeChange();
                if (transaction.subcategory) {
                    ui.populateSubcategoryDropdown(transaction.category, transaction.subcategory);
                }
                transactionModal.classList.remove('hidden');
                transactionModal.classList.add('flex');
            }
            return;
        }

        const deleteBtn = e.target.closest('.delete-transaction-btn');
        if (deleteBtn) {
            const id = parseInt(deleteBtn.dataset.id);
            const transaction = wallet.transactions.find(tx => tx.id === id);
            if (transaction) {
                    ui.showConfirmationModal(
                        `¿Seguro que quieres eliminar el ${transaction.type === 'income' ? 'ingreso' : 'gasto'} "${transaction.description}"?`,
                        async () => {
                            wallet.transactions = wallet.transactions.filter(tx => tx.id !== id);
                            await updateDataInFirestore();
                            ui.renderTransactions();
                        }
                    );
            }
        }
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => transactionModal.classList.add('hidden'));
    transactionModal.addEventListener('click', (e) => { if (e.target === transactionModal) transactionModal.classList.add('hidden'); });

    // Close Fixed Income Modal
    const closeFixedIncomeBtn = document.getElementById('closeFixedIncomeModalBtn');
    if (closeFixedIncomeBtn) {
        closeFixedIncomeBtn.addEventListener('click', () => {
            fixedIncomeModal.classList.add('hidden');
            fixedIncomeModal.classList.remove('flex');
        });
    }
    if (fixedIncomeModal) {
        fixedIncomeModal.addEventListener('click', (e) => {
            if (e.target === fixedIncomeModal) {
                fixedIncomeModal.classList.add('hidden');
                fixedIncomeModal.classList.remove('flex');
            }
        });
    }

    // Close Installment Modal
    const closeInstallmentBtn = document.getElementById('closeInstallmentModalBtn');
    if (closeInstallmentBtn) {
        closeInstallmentBtn.addEventListener('click', () => {
            installmentModal.classList.add('hidden');
            installmentModal.classList.remove('flex');
        });
    }
    if (installmentModal) {
        installmentModal.addEventListener('click', (e) => {
            if (e.target === installmentModal) {
                installmentModal.classList.add('hidden');
                installmentModal.classList.remove('flex');
            }
        });
    }

    const handleTransactionTypeChange = () => {
        const typeSelect = document.getElementById('type');
        const categorySelect = document.getElementById('category');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
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
            if (currentCategory === 'Ingresos' || !categorySelect.value) {
                const firstExpenseCategory = Object.keys(state.getCurrentWallet().transactionCategories).find(c => c !== 'Ingresos' && c !== '[Pago de Deuda]');
                if (firstExpenseCategory) categorySelect.value = firstExpenseCategory;
            }
        }
        ui.populateSubcategoryDropdown(categorySelect.value);
    };

    document.getElementById('type').addEventListener('change', handleTransactionTypeChange);
    document.getElementById('category').addEventListener('change', () => ui.populateSubcategoryDropdown(document.getElementById('category').value));

    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        showInputModal('Crear Nueva Categoría', 'Nombre de la categoría', (newCategory) => {
            const wallet = state.getCurrentWallet();
            if (newCategory && !wallet.transactionCategories[newCategory]) {
                wallet.transactionCategories[newCategory] = [];
                wallet.budgets[newCategory] = { total: null, type: 'variable', subcategories: {} };
                updateDataInFirestore();
                handleTransactionTypeChange();
                document.getElementById('category').value = newCategory;
            }
        });
    });

    document.getElementById('addSubcategoryBtn').addEventListener('click', () => {
        const currentCategory = document.getElementById('category').value;
        const wallet = state.getCurrentWallet();
        if (!currentCategory || currentCategory === 'Ingresos' || !wallet.transactionCategories[currentCategory]) return;
        showInputModal(`Nueva Subcategoría para "${currentCategory}"`, 'Nombre de la subcategoría', (newSubcategory) => {
            if (!wallet.transactionCategories[currentCategory].includes(newSubcategory)) {
                wallet.transactionCategories[currentCategory].push(newSubcategory);
                updateDataInFirestore();
                ui.populateSubcategoryDropdown(currentCategory, newSubcategory);
            }
        });
    });

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
        if (id) {
            const index = wallet.transactions.findIndex(tx => tx.id === id);
            if (index !== -1) wallet.transactions[index] = { ...wallet.transactions[index], ...transactionData };
        } else {
            wallet.transactions.push({ id: Date.now(), ...transactionData });
        }
        await updateDataInFirestore();
        transactionModal.classList.add('hidden');
        ui.renderTransactions();
        ui.renderBudgets();
    });

    // --- Fixed Income Form Submit ---
    if (fixedIncomeForm) {
        fixedIncomeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const wallet = state.getCurrentWallet();
            if (!wallet) return;
            
            const id = parseInt(document.getElementById('fixedIncomeId').value);
            const incomeData = {
                description: document.getElementById('fixedIncomeDescription').value,
                expectedAmount: ui.getNumericValue(document.getElementById('fixedIncomeExpectedAmount').value)
            };
            
            if (id) {
                const income = wallet.fixedIncomes.find(i => i.id === id);
                if (income) {
                    income.description = incomeData.description;
                    income.expectedAmount = incomeData.expectedAmount;
                }
            } else {
                wallet.fixedIncomes.push({ id: Date.now(), ...incomeData, payments: {} });
            }
            
            await updateDataInFirestore();
            fixedIncomeModal.classList.add('hidden');
            fixedIncomeModal.classList.remove('flex');
            ui.renderFixedIncomes();
            ui.renderBudgets();
        });
    }

    // --- Installment Form Submit ---
    if (installmentForm) {
        installmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const wallet = state.getCurrentWallet();
            if (!wallet) return;
            
            const id = parseInt(document.getElementById('installmentId').value);
            const installmentData = {
                description: document.getElementById('installmentDescription').value,
                totalAmount: ui.getNumericValue(document.getElementById('installmentTotalAmount').value),
                totalInstallments: ui.getNumericValue(document.getElementById('installmentTotal').value),
                type: document.getElementById('installmentType').value
            };
            
            if (id) {
                const item = wallet.installments.find(i => i.id === id);
                if (item) {
                    item.description = installmentData.description;
                    item.totalAmount = installmentData.totalAmount;
                    item.totalInstallments = installmentData.totalInstallments;
                    item.type = installmentData.type;
                }
            } else {
                wallet.installments.push({ id: Date.now(), ...installmentData, paidInstallments: 0 });
            }
            
            await updateDataInFirestore();
            installmentModal.classList.add('hidden');
            installmentModal.classList.remove('flex');
            ui.renderInstallments();
            ui.renderBudgets();
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-btn.bg-indigo-600').classList.replace('bg-indigo-600', 'bg-gray-600');
            btn.classList.replace('bg-gray-600', 'bg-indigo-600');
            state.setCurrentFilter(btn.dataset.filter);
            ui.renderTransactions();
        });
    });
    document.getElementById('transactionCategoryFilter').addEventListener('change', e => {
        state.setFilterCategory(e.target.value);
        ui.renderTransactions();
    });
    document.getElementById('transaction-table-header').addEventListener('click', e => {
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

    // --- Botones Presupuestos y Cuotas ---
    
    document.getElementById('addFixedIncomeBtn').addEventListener('click', () => {
        document.getElementById('fixedIncomeModalTitle').textContent = "Nuevo Ingreso Fijo";
        document.getElementById('fixedIncomeForm').reset();
        document.getElementById('fixedIncomeId').value = '';
        document.getElementById('fixedIncomeModal').classList.remove('hidden');
        document.getElementById('fixedIncomeModal').classList.add('flex');
    });

    document.getElementById('addInstallmentBtn').addEventListener('click', () => {
        document.getElementById('installmentModalTitle').textContent = "Nueva Compra o Crédito";
        document.getElementById('installmentForm').reset();
        document.getElementById('installmentId').value = '';
        document.getElementById('installmentModal').classList.remove('hidden');
        document.getElementById('installmentModal').classList.add('flex');
    });

    incomeAndBudgetsContent.addEventListener('click', async (e) => {
        const wallet = state.getCurrentWallet();
        if (!wallet) return;

        const handleAction = async (action) => {
            action();
            await updateDataInFirestore();
            ui.renderBudgets();
        };

        const toggleBtn = e.target.closest('.category-toggle-btn');
        if (toggleBtn) {
            const targetId = toggleBtn.dataset.target;
            const wrapper = document.getElementById(targetId);
            const icon = toggleBtn.querySelector('i');
            if (wrapper) {
                wrapper.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            }
            return;
        }

        const addRecurrentBtn = e.target.closest('#addRecurrentCategoryBtn');
        if (addRecurrentBtn) {
            const input = document.getElementById('newRecurrentCategoryInput');
            const newCategory = input.value.trim();
            if (newCategory && !wallet.transactionCategories[newCategory]) {
                handleAction(() => {
                    wallet.transactionCategories[newCategory] = [];
                    wallet.budgets[newCategory] = { total: null, type: 'recurrent', subcategories: {}, payments: {} };
                    input.value = '';
                });
            }
        }
        
        const addVariableBtn = e.target.closest('#addVariableCategoryBtn');
        if (addVariableBtn) {
            const input = document.getElementById('newVariableCategoryInput');
            const newCategory = input.value.trim();
            if (newCategory && !wallet.transactionCategories[newCategory]) {
                handleAction(() => {
                    wallet.transactionCategories[newCategory] = [];
                    wallet.budgets[newCategory] = { total: null, type: 'variable', subcategories: {} };
                    input.value = '';
                });
            }
        }
        
        const editCategoryBtn = e.target.closest('.edit-category-btn');
        if (editCategoryBtn) { ui.handleEditCategory(editCategoryBtn.dataset.category); }

        const deleteCategoryBtn = e.target.closest('.delete-category-btn');
        if (deleteCategoryBtn) {
            const category = deleteCategoryBtn.dataset.category;
            ui.showConfirmationModal(`¿Seguro que quieres eliminar la categoría "${category}"?`, () => handleAction(() => {
                delete wallet.transactionCategories[category];
                delete wallet.budgets[category];
            }));
        }
        
        const editSubcategoryBtn = e.target.closest('.edit-subcategory-btn');
        if (editSubcategoryBtn) { ui.handleEditSubcategory(editSubcategoryBtn.dataset.category, editSubcategoryBtn.dataset.subcategory); }

        const deleteSubcategoryBtn = e.target.closest('.delete-subcategory-btn');
        if (deleteSubcategoryBtn) {
            const { category, subcategory } = deleteSubcategoryBtn.dataset;
            ui.showConfirmationModal(`¿Seguro que quieres eliminar la subcategoría "${subcategory}"?`, () => handleAction(() => {
                wallet.transactionCategories[category] = wallet.transactionCategories[category].filter(s => s !== subcategory);
                delete wallet.budgets[category].subcategories[subcategory];
            }));
        }

        const addSubcategoryBtn = e.target.closest('.add-subcategory-btn');
        if (addSubcategoryBtn) {
            const category = addSubcategoryBtn.dataset.category;
            const input = addSubcategoryBtn.previousElementSibling;
            const newSubcategory = input.value.trim();
            if (newSubcategory && !wallet.transactionCategories[category].includes(newSubcategory)) {
                handleAction(() => {
                    wallet.transactionCategories[category].push(newSubcategory);
                    input.value = '';
                });
            }
        }

        // --- Acciones Ingresos Fijos ---
        const editFixedIncomeBtn = e.target.closest('.edit-fixed-income-btn');
        if (editFixedIncomeBtn) {
            const id = parseInt(editFixedIncomeBtn.dataset.id);
            const income = wallet.fixedIncomes.find(fi => fi.id === id);
            if (income) {
                document.getElementById('fixedIncomeModalTitle').textContent = "Editar Ingreso Fijo";
                document.getElementById('fixedIncomeId').value = income.id;
                document.getElementById('fixedIncomeDescription').value = income.description;
                document.getElementById('fixedIncomeExpectedAmount').value = income.expectedAmount;
                document.getElementById('fixedIncomeModal').classList.remove('hidden');
                document.getElementById('fixedIncomeModal').classList.add('flex');
            }
        }

        const deleteFixedIncomeBtn = e.target.closest('.delete-fixed-income-btn');
        if (deleteFixedIncomeBtn) {
            const id = parseInt(deleteFixedIncomeBtn.dataset.id);
            const income = wallet.fixedIncomes.find(fi => fi.id === id);
            ui.showConfirmationModal(`¿Seguro que quieres eliminar el ingreso fijo "${income.description}"?`, () => handleAction(() => {
                wallet.fixedIncomes = wallet.fixedIncomes.filter(fi => fi.id !== id);
            }));
        }

        // --- Acciones Cuotas ---
        const unpayInstallmentBtn = e.target.closest('.unpay-installment-btn');
        if (unpayInstallmentBtn) {
            const id = parseInt(unpayInstallmentBtn.dataset.id);
            handleAction(() => {
                const item = wallet.installments.find(i => i.id === id);
                if (item && item.paidInstallments > 0) item.paidInstallments--;
            });
        }

        const payInstallmentBtn = e.target.closest('.pay-installment-btn');
        if (payInstallmentBtn) {
            const id = parseInt(payInstallmentBtn.dataset.id);
            handleAction(() => {
                const item = wallet.installments.find(i => i.id === id);
                if (item && item.paidInstallments < item.totalInstallments) item.paidInstallments++;
            });
        }

        const editInstallmentBtn = e.target.closest('.edit-installment-btn');
        if (editInstallmentBtn) {
            const id = parseInt(editInstallmentBtn.dataset.id);
            const item = wallet.installments.find(i => i.id === id);
            if(item) {
                document.getElementById('installmentModalTitle').textContent = "Editar Compra o Crédito";
                document.getElementById('installmentId').value = item.id;
                document.getElementById('installmentDescription').value = item.description;
                document.getElementById('installmentTotalAmount').value = item.totalAmount;
                document.getElementById('installmentTotal').value = item.totalInstallments;
                document.getElementById('installmentType').value = item.type;
                document.getElementById('installmentModal').classList.remove('hidden');
                document.getElementById('installmentModal').classList.add('flex');
            }
        }
        
        const deleteInstallmentBtn = e.target.closest('.delete-installment-btn');
        if (deleteInstallmentBtn) {
            const id = parseInt(deleteInstallmentBtn.dataset.id);
            const installment = wallet.installments.find(i => i.id === id);
            ui.showConfirmationModal(`¿Seguro que quieres eliminar la compra "${installment.description}"?`, () => handleAction(() => {
                wallet.installments = wallet.installments.filter(i => i.id !== id);
            }));
        }

        // --- Toggle para checkbox de "Recibido" en Ingresos Fijos ---
        const toggleLabel = e.target.closest('.toggle-label');
        if (toggleLabel && toggleLabel.previousElementSibling?.classList.contains('fixed-income-received-toggle')) {
            const checkbox = toggleLabel.previousElementSibling;
            if (!checkbox.disabled) {
                checkbox.checked = !checkbox.checked;
                // Dispara el evento 'change' manualmente
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            }
        }
    });
    
    incomeAndBudgetsContent.addEventListener('change', async (e) => {
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
            let isReceived = receivedToggle.checked;
            
            // Si se ingresa un monto real > 0, activar automáticamente el toggle
            if (e.target.matches('.fixed-income-real-amount') && realAmount > 0 && !isReceived) {
                receivedToggle.checked = true;
                isReceived = true;
                receivedToggle.disabled = false;
            }
            // Si se borra el monto o es 0, desactivar el toggle
            else if (e.target.matches('.fixed-income-real-amount') && realAmount <= 0 && isReceived) {
                receivedToggle.checked = false;
                isReceived = false;
            }
            
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
            ui.renderFixedIncomes();
            ui.renderBudgets();
            ui.renderTransactions();
            return;
        }

        // --- Presupuestos de Categorías ---
        if (e.target.matches('.category-budget-input')) {
            const category = e.target.dataset.category;
            const budgetValue = ui.getNumericValue(e.target.value);
            
            if (!wallet.budgets[category]) wallet.budgets[category] = { total: null, subcategories: {}, payments: {} };
            wallet.budgets[category].total = budgetValue || null;
            
            await updateDataInFirestore();
            ui.renderBudgets();
            return;
        }

        // --- Presupuestos de Subcategorías ---
        if (e.target.matches('.subcategory-budget-input')) {
            const category = e.target.dataset.category;
            const subcategory = e.target.dataset.subcategory;
            const budgetValue = ui.getNumericValue(e.target.value);
            
            if (!wallet.budgets[category]) wallet.budgets[category] = { total: null, subcategories: {}, payments: {} };
            if (!wallet.budgets[category].subcategories) wallet.budgets[category].subcategories = {};
            
            if (budgetValue > 0) {
                wallet.budgets[category].subcategories[subcategory] = budgetValue;
            } else {
                delete wallet.budgets[category].subcategories[subcategory];
            }
            
            await updateDataInFirestore();
            ui.renderBudgets();
            return;
        }

        // --- Montos Pagados en Gastos Recurrentes ---
        if (e.target.matches('.recurrent-paid-amount-input')) {
            const category = e.target.dataset.category;
            const subcategory = e.target.dataset.subcategory;
            const paidAmount = ui.getNumericValue(e.target.value);
            
            if (!wallet.budgets[category]) wallet.budgets[category] = { total: null, subcategories: {}, payments: {} };
            if (!wallet.budgets[category].payments) wallet.budgets[category].payments = {};
            if (!wallet.budgets[category].payments[periodKey]) wallet.budgets[category].payments[periodKey] = {};
            
            if (subcategory) {
                // Pago de subcategoría
                if (!wallet.budgets[category].payments[periodKey][subcategory]) {
                    wallet.budgets[category].payments[periodKey][subcategory] = {};
                }
                wallet.budgets[category].payments[periodKey][subcategory].amount = paidAmount;
            } else {
                // Pago de categoría sin subcategoría
                wallet.budgets[category].payments[periodKey].amount = paidAmount;
            }
            
            // --- Crear transacción automáticamente para gastos mensuales/recurrentes ---
            const budgetData = wallet.budgets[category];
            const paymentInfo = subcategory ? 
                budgetData.payments[periodKey][subcategory] : 
                budgetData.payments[periodKey];
            
            const paymentType = paymentInfo?.type || 'expense_debit';
            const txCategory = subcategory || category;
            
            // Buscar transacción existente para este gasto recurrente
            const txIndex = wallet.transactions.findIndex(tx => 
                tx.category === category && 
                tx.subcategory === subcategory && 
                tx.isRecurrentPayment &&
                tx.periodKey === periodKey
            );
            
            if (paidAmount > 0) {
                const txData = {
                    description: subcategory || category,
                    amount: paidAmount,
                    date: new Date().toISOString().slice(0, 10),
                    type: paymentType,
                    category: category,
                    subcategory: subcategory || null,
                    isRecurrentPayment: true,
                    periodKey: periodKey
                };
                
                if (txIndex > -1) {
                    // Actualizar transacción existente
                    wallet.transactions[txIndex] = { ...wallet.transactions[txIndex], ...txData };
                } else {
                    // Crear nueva transacción
                    wallet.transactions.push({ id: Date.now(), ...txData });
                }
            } else {
                // Si el monto es 0, eliminar la transacción
                if (txIndex > -1) wallet.transactions.splice(txIndex, 1);
            }
            
            await updateDataInFirestore();
            ui.renderBudgets();
            ui.renderTransactions();
            return;
        }

        // --- Tipo de Pago en Gastos Recurrentes ---
        if (e.target.matches('.recurrent-payment-type-select')) {
            const category = e.target.dataset.category;
            const subcategory = e.target.dataset.subcategory;
            const paymentType = e.target.value;
            
            if (!wallet.budgets[category]) wallet.budgets[category] = { total: null, subcategories: {}, payments: {} };
            if (!wallet.budgets[category].payments) wallet.budgets[category].payments = {};
            if (!wallet.budgets[category].payments[periodKey]) wallet.budgets[category].payments[periodKey] = {};
            
            if (subcategory) {
                // Tipo de pago de subcategoría
                if (!wallet.budgets[category].payments[periodKey][subcategory]) {
                    wallet.budgets[category].payments[periodKey][subcategory] = {};
                }
                wallet.budgets[category].payments[periodKey][subcategory].type = paymentType;
            } else {
                // Tipo de pago de categoría sin subcategoría
                wallet.budgets[category].payments[periodKey].type = paymentType;
            }
            
            await updateDataInFirestore();
            return;
        }
    });


    document.getElementById('runAiAnalysisBtn').addEventListener('click', ui.runFullAiAnalysis);
    document.getElementById('downloadAiAnalysisBtn').addEventListener('click', ui.generateAnalysisPDF);

    document.getElementById('addWalletBtn').addEventListener('click', async () => {
        const input = document.getElementById('newWalletInput');
        const newName = input.value.trim();
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
            input.value = '';
            await updateDataInFirestore();
        }
    });

    document.getElementById('walletList').addEventListener('click', (e) => {
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
            ui.showConfirmationModal(`¿Seguro que quieres eliminar la billetera "${wallet.name}"?`, async () => {
                state.setWallets(state.wallets.filter(w => w.id !== walletId));
                if (state.currentWalletId === walletId) {
                    state.setCurrentWalletId(state.wallets[0].id);
                }
                await updateDataInFirestore();
            });
        }
    });

    document.getElementById('creditCardLimitInput').addEventListener('change', (e) => {
        const wallet = state.getCurrentWallet();
        if (wallet) {
            wallet.creditCardLimit = ui.getNumericValue(e.target.value) || 0;
            updateDataInFirestore();
        }
    });
    
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        state.setGeminiApiKey(document.getElementById('geminiApiKeyInput').value);
        updateDataInFirestore();
    });
    
    document.getElementById('confirmActionBtn').addEventListener('click', () => {
        if (currentConfirmAction) {
            currentConfirmAction();
        }
        ui.hideConfirmationModal();
        currentConfirmAction = null;
    });

    document.getElementById('cancelConfirmationBtn').addEventListener('click', ui.hideConfirmationModal);
    document.getElementById('confirmationModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirmationModal')) ui.hideConfirmationModal();
    });
    
    document.getElementById('inputModalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (currentInputConfirmAction) {
            const value = document.getElementById('inputModalField').value;
            if (value && value.trim() !== '') {
                currentInputConfirmAction(value.trim());
            }
        }
        ui.hideInputModal();
    });

    document.getElementById('cancelInputBtn').addEventListener('click', ui.hideInputModal);
    document.getElementById('inputModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('inputModal')) ui.hideInputModal();
    });
}
