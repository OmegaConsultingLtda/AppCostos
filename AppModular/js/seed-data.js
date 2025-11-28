// AppModular/js/seed-data.js

/**
 * Genera un conjunto de datos de prueba masivo y detallado.
 */
export function getSeedData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const formatDate = (year, month, day) => {
        const d = new Date(year, month, day);
        return d.toISOString().slice(0, 10);
    };

    const randomDay = () => Math.floor(Math.random() * 28) + 1;

    // --- IDs de Tarjetas ---
    const personal_card_1 = 1710000000001;
    const personal_card_2 = 1710000000002;
    const personal_card_3 = 1710000000003;
    const personal_card_4 = 1710000000004;
    const negocio_card_1 = 1720000000001;
    const negocio_card_2 = 1720000000002;

    // --- Transacciones del Mes Anterior (para copiar) ---
    const previousMonthDate = new Date(currentYear, currentMonth - 1, 15);
    const prevYear = previousMonthDate.getFullYear();
    const prevMonth = previousMonthDate.getMonth();
    const previousMonthTransactions = [
        { id: Date.now() + 1, description: "Sueldo (Mes Anterior)", amount: 2450000, date: formatDate(prevYear, prevMonth, 1), type: 'income', category: 'Ingresos', subcategory: null },
        { id: Date.now() + 2, description: "Arriendo (Mes Anterior)", amount: 550000, date: formatDate(prevYear, prevMonth, 5), type: 'expense_debit', category: 'Cuentas', subcategory: 'Arriendo' },
        { id: Date.now() + 3, description: "Supermercado (Mes Anterior)", amount: 120000, date: formatDate(prevYear, prevMonth, 10), type: 'expense_credit', category: 'Compras', subcategory: 'Supermercado', cardId: personal_card_1 },
        { id: Date.now() + 4, description: "Bencina (Mes Anterior)", amount: 60000, date: formatDate(prevYear, prevMonth, 15), type: 'expense_credit', category: 'Transporte', subcategory: 'Bencina', cardId: personal_card_2 },
        { id: Date.now() + 5, description: "Restaurante (Mes Anterior)", amount: 45000, date: formatDate(prevYear, prevMonth, 20), type: 'expense_credit', category: 'Restaurante', subcategory: 'Cena', cardId: personal_card_3 },
    ];

    // --- BILLETERA 1: PERSONAL (MUY ACTIVA) ---
    const wallet1_personal = {
        id: 1,
        name: "Billetera Personal",
        transactions: [
            // Ingresos
            { id: Date.now() + 100, description: "Sueldo", amount: 2500000, date: formatDate(currentYear, currentMonth, 1), type: 'income', category: 'Ingresos', subcategory: null, isFixedIncomePayment: true, fixedIncomeId: 1 },
            { id: Date.now() + 101, description: "Devolución de Impuestos", amount: 150000, date: formatDate(currentYear, currentMonth, 12), type: 'income', category: 'Ingresos', subcategory: null },
            { id: Date.now() + 102, description: "Venta Monitor", amount: 120000, date: formatDate(currentYear, currentMonth, 18), type: 'income', category: 'Ingresos', subcategory: null },
            // Gastos Débito
            { id: Date.now() + 103, description: "Arriendo Depto", amount: 550000, date: formatDate(currentYear, currentMonth, 5), type: 'expense_debit', category: 'Cuentas', subcategory: 'Arriendo', isRecurrentPayment: true, periodKey: `${currentYear}-${currentMonth + 1}` },
            { id: Date.now() + 104, description: "Gimnasio", amount: 25990, date: formatDate(currentYear, currentMonth, 3), type: 'expense_debit', category: 'Salud', subcategory: 'Gimnasio', isRecurrentPayment: true, periodKey: `${currentYear}-${currentMonth + 1}` },
            { id: Date.now() + 105, description: "Transferencia a Ahorro", amount: 200000, date: formatDate(currentYear, currentMonth, 2), type: 'expense_debit', category: 'Ahorro e Inversión', subcategory: 'Ahorro' },
            // Gastos Crédito (Tarjeta 1: Santander)
            { id: Date.now() + 106, description: "Supermercado Lider", amount: 135000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Compras', subcategory: 'Supermercado', cardId: personal_card_1 },
            { id: Date.now() + 107, description: "Pago Internet VTR", amount: 32990, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Cuentas', subcategory: 'Internet', cardId: personal_card_1, isRecurrentPayment: true, periodKey: `${currentYear}-${currentMonth + 1}` },
            { id: Date.now() + 108, description: "Bencina Copec", amount: 45000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Transporte', subcategory: 'Bencina', cardId: personal_card_1 },
            { id: Date.now() + 109, description: "Autopista", amount: 25000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Transporte', subcategory: 'Autopista', cardId: personal_card_1 },
            { id: Date.now() + 110, description: "Almuerzo 1", amount: 9500, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Restaurante', subcategory: 'Almuerzo', cardId: personal_card_1 },
            // Gastos Crédito (Tarjeta 2: BCI)
            { id: Date.now() + 111, description: "Cena con amigos", amount: 35000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Restaurante', subcategory: 'Cena', cardId: personal_card_2 },
            { id: Date.now() + 112, description: "Ropa H&M", amount: 49990, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Compras', subcategory: 'Ropa', cardId: personal_card_2 },
            { id: Date.now() + 113, description: "Netflix", amount: 8500, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Ocio', subcategory: 'Streaming', cardId: personal_card_2 },
            { id: Date.now() + 114, description: "Spotify", amount: 4500, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Ocio', subcategory: 'Streaming', cardId: personal_card_2 },
            { id: Date.now() + 115, description: "Almuerzo 2", amount: 12000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Restaurante', subcategory: 'Almuerzo', cardId: personal_card_2 },
            // Gastos Crédito (Tarjeta 3: Scotiabank) -> GASTOS EXCESIVOS
            { id: Date.now() + 116, description: "Concierto", amount: 95000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Ocio', subcategory: 'Conciertos', cardId: personal_card_3 },
            { id: Date.now() + 117, description: "Regalo Cumpleaños", amount: 40000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Regalos', subcategory: null, cardId: personal_card_3 },
            { id: Date.now() + 118, description: "Delivery Sushi", amount: 22000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Restaurante', subcategory: 'Delivery', cardId: personal_card_3 },
            { id: Date.now() + 119, description: "Uber", amount: 7500, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Transporte', subcategory: 'Apps', cardId: personal_card_3 },
            { id: Date.now() + 120, description: "Cena Romántica", amount: 65000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Restaurante', subcategory: 'Cena', cardId: personal_card_3 }, // Supera presupuesto
            // Gastos Crédito (Tarjeta 4: Itaú)
            { id: Date.now() + 121, description: "Farmacia", amount: 22000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Salud', subcategory: 'Farmacia', cardId: personal_card_4 },
            { id: Date.now() + 122, description: "Libros", amount: 30000, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Educación', subcategory: 'Libros', cardId: personal_card_4 },
            { id: Date.now() + 123, description: "Café", amount: 4500, date: formatDate(currentYear, currentMonth, randomDay()), type: 'expense_credit', category: 'Restaurante', subcategory: 'Café', cardId: personal_card_4 },
        ],
        previousMonthTransactions: previousMonthTransactions,
        fixedIncomes: [
            { id: 1, description: "Sueldo Mensual", expectedAmount: 2500000, payments: { [`${currentYear}-${currentMonth + 1}`]: { amount: 2500000, received: true } } },
            { id: 2, description: "Freelance", expectedAmount: 300000, payments: {} }
        ],
        installments: [
            { id: 1, description: "Macbook Pro", totalAmount: 1200000, totalInstallments: 12, paidInstallments: 8, type: 'credit_card', cardId: personal_card_1 },
            { id: 2, description: "Crédito Hipotecario", totalAmount: 80000000, totalInstallments: 240, paidInstallments: 36, type: 'consumer_loan' },
            { id: 3, description: "Celular Nuevo", totalAmount: 800000, totalInstallments: 24, paidInstallments: 2, type: 'credit_card', cardId: personal_card_3 },
        ],
        creditCards: [
            { id: personal_card_1, name: "Santander WorldMember", limit: 2000000, bankAvailable: 1500000 },
            { id: personal_card_2, name: "BCI OpenSky", limit: 3000000, bankAvailable: 2800000 },
            { id: personal_card_3, name: "Scotiabank Pulse", limit: 1000000, bankAvailable: 750000 },
            { id: personal_card_4, name: "Itaú Personal Bank", limit: 5000000, bankAvailable: 4900000 },
        ],
        transactionCategories: {
            'Ingresos': [], '[Pago de Deuda]': [], 'Cuentas': ['Arriendo', 'Gastos Comunes', 'Luz', 'Agua', 'Gas', 'Internet', 'Celular'],
            'Compras': ['Supermercado', 'Ropa', 'Hogar', 'Tecnología'], 'Transporte': ['Bencina', 'Transporte Público', 'Mantención Auto', 'Autopista', 'Apps'],
            'Restaurante': ['Almuerzo', 'Cena', 'Delivery', 'Café'], 'Ocio': ['Cine', 'Streaming', 'Conciertos', 'Viajes', 'Hobbies'],
            'Salud': ['Gimnasio', 'Farmacia', 'Consulta Médica'], 'Educación': ['Cursos', 'Libros'], 'Ahorro e Inversión': ['Ahorro', 'APV', 'Inversiones'],
            'Regalos': [], 'Otros': []
        },
        budgets: {
            'Cuentas': { total: 582980, type: 'recurrent', subcategories: { 'Arriendo': 550000, 'Internet': 32990 }, payments: { [`${currentYear}-${currentMonth + 1}`]: { 'Arriendo': { amount: 550000 }, 'Internet': { amount: 32990, type: 'expense_credit', cardId: personal_card_1 } } }, config: { priority: 1, flexible: false } },
            'Salud': { total: 50000, type: 'recurrent', subcategories: { 'Gimnasio': 25990 }, payments: { [`${currentYear}-${currentMonth + 1}`]: { 'Gimnasio': { amount: 25990 } } }, config: { priority: 2, flexible: false } },
            'Transporte': { total: 80000, type: 'variable', subcategories: {}, config: { priority: 3, flexible: true } },
            'Compras': { total: 150000, type: 'variable', subcategories: { 'Supermercado': 150000 }, config: { priority: 2, flexible: false } },
            'Restaurante': { total: 80000, type: 'variable', subcategories: {}, config: { priority: 4, flexible: true } }, // Presupuesto excedido
            'Ocio': { total: 100000, type: 'variable', subcategories: {}, config: { priority: 5, flexible: true } }, // Presupuesto excedido
            'Ahorro e Inversión': { total: 200000, type: 'variable', subcategories: {}, config: { priority: 1, flexible: false } },
        },
        bankDebitBalance: 1650000,
        manualSurplus: { [`${currentYear}-${currentMonth}`]: 125000 }
    };

    // --- BILLETERA 2: NEGOCIO (ACTIVIDAD MEDIA) ---
    const wallet2_negocio = {
        id: 2,
        name: "Billetera Negocio",
        transactions: [
            { id: Date.now() + 200, description: "Pago Cliente A", amount: 800000, date: formatDate(currentYear, currentMonth, 5), type: 'income', category: 'Ingresos', subcategory: null },
            { id: Date.now() + 201, description: "Pago Cliente B", amount: 1200000, date: formatDate(currentYear, currentMonth, 20), type: 'income', category: 'Ingresos', subcategory: null },
            { id: Date.now() + 202, description: "Arriendo Oficina", amount: 350000, date: formatDate(currentYear, currentMonth, 2), type: 'expense_debit', category: 'Cuentas', subcategory: 'Arriendo' },
            { id: Date.now() + 203, description: "Suscripción Adobe", amount: 55000, date: formatDate(currentYear, currentMonth, 10), type: 'expense_credit', category: 'Software', subcategory: 'Suscripciones', cardId: negocio_card_1 },
            { id: Date.now() + 204, description: "Publicidad Google", amount: 150000, date: formatDate(currentYear, currentMonth, 15), type: 'expense_credit', category: 'Marketing', subcategory: 'Publicidad Online', cardId: negocio_card_1 },
            { id: Date.now() + 205, description: "Almuerzo con Cliente", amount: 45000, date: formatDate(currentYear, currentMonth, 18), type: 'expense_credit', category: 'Ventas', subcategory: 'Representación', cardId: negocio_card_2 },
            { id: Date.now() + 206, description: "Insumos de Oficina", amount: 35000, date: formatDate(currentYear, currentMonth, 8), type: 'expense_debit', category: 'Operación', subcategory: 'Insumos' },
            { id: Date.now() + 207, description: "Hosting y Dominio", amount: 80000, date: formatDate(currentYear, currentMonth, 22), type: 'expense_credit', category: 'Software', subcategory: 'Infraestructura', cardId: negocio_card_1 },
            { id: Date.now() + 208, description: "Contador", amount: 100000, date: formatDate(currentYear, currentMonth, 28), type: 'expense_debit', category: 'Servicios Profesionales', subcategory: 'Contabilidad' },
        ],
        previousMonthTransactions: [],
        fixedIncomes: [],
        installments: [
            { id: 4, description: "Equipo Fotográfico", totalAmount: 2500000, totalInstallments: 12, paidInstallments: 3, type: 'credit_card', cardId: negocio_card_2 },
        ],
        creditCards: [
            { id: negocio_card_1, name: "BCI Empresa", limit: 4000000, bankAvailable: 3500000 },
            { id: negocio_card_2, name: "Santander Pyme", limit: 3000000, bankAvailable: 2500000 },
        ],
        transactionCategories: {
            'Ingresos': [], 'Cuentas': ['Arriendo', 'Servicios Básicos'], 'Software': ['Suscripciones', 'Infraestructura'],
            'Marketing': ['Publicidad Online', 'Eventos'], 'Ventas': ['Representación', 'Comisiones'],
            'Operación': ['Insumos', 'Logística'], 'Servicios Profesionales': ['Contabilidad', 'Legal'], 'Otros': []
        },
        budgets: {
            'Cuentas': { total: 350000, type: 'recurrent', subcategories: {}, config: { priority: 1 } },
            'Software': { total: 150000, type: 'variable', subcategories: {}, config: { priority: 2 } },
            'Marketing': { total: 200000, type: 'variable', subcategories: {}, config: { priority: 3 } },
        },
        bankDebitBalance: 1200000,
        manualSurplus: {}
    };

    // --- BILLETERA 3: AHORRO E INVERSIÓN (BAJA ACTIVIDAD) ---
    const wallet3_ahorro = {
        id: 3,
        name: "Ahorro e Inversión",
        transactions: [
            { id: Date.now() + 300, description: "Transferencia desde Cta. Personal", amount: 200000, date: formatDate(currentYear, currentMonth, 3), type: 'income', category: 'Ingresos', subcategory: 'Transferencias' },
            { id: Date.now() + 301, description: "Aporte a Fintual", amount: 150000, date: formatDate(currentYear, currentMonth, 4), type: 'expense_debit', category: 'Inversiones', subcategory: 'Fondos Mutuos' },
            { id: Date.now() + 302, description: "Compra de Acciones", amount: 50000, date: formatDate(currentYear, currentMonth, 15), type: 'expense_debit', category: 'Inversiones', subcategory: 'Acciones' },
        ],
        previousMonthTransactions: [],
        fixedIncomes: [],
        installments: [],
        creditCards: [],
        transactionCategories: { 'Ingresos': ['Transferencias', 'Dividendos'], 'Inversiones': ['Fondos Mutuos', 'Acciones', 'APV'], 'Otros': [] },
        budgets: {},
        bankDebitBalance: 500000,
        manualSurplus: {}
    };

    // --- Ensamblaje Final ---
    const seedData = {
        wallets: [wallet1_personal, wallet2_negocio, wallet3_ahorro],
        currentWalletId: 1,
        geminiApiKey: "",
        exchangeRates: {
            USD: 945,
            UF: 37100,
            lastUpdated: new Date().toISOString()
        }
    };

    // Sumar todas las transacciones para verificar el conteo
    const totalTransactions = seedData.wallets.reduce((sum, wallet) => sum + wallet.transactions.length, 0);
    console.log(`Generated seed data with ${totalTransactions} total transactions across ${seedData.wallets.length} wallets.`);

    return seedData;
}
