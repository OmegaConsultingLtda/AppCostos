// main.js

import * as state from './state.js';
import { setupFirebase, saveDataToFirestore } from './firebase.js';
import { initializeEventListeners } from './handlers.js';
import { getEnvironment } from './env.js';
import { getSeedData } from './seed-data.js';
import { renderAll } from './ui.js';

// --- QA Tools Functions ---
function setupQATools() {
    const env = getEnvironment();
    const banner = document.getElementById('qaEnvBanner');
    const panel = document.getElementById('qaToolsPanel');

    if (env === 'qa') {
        banner.classList.remove('hidden');
        panel.classList.remove('hidden');

        document.getElementById('qaLoadSeedDataBtn').addEventListener('click', () => {
            if (confirm("¿Seguro que quieres sobreescribir TUS DATOS con los datos de prueba? Esta acción no se puede deshacer.")) {
                const seedData = getSeedData();
                // Sobrescribir el estado local
                state.setWallets(seedData.wallets);
                state.setCurrentWalletId(seedData.currentWalletId);
                state.setGeminiApiKey(seedData.geminiApiKey);
                state.setExchangeRates(seedData.exchangeRates);
                // Forzar guardado inmediato en Firestore y recargar la UI
                saveDataToFirestore(true);
                renderAll();
                alert("Datos de prueba cargados y guardados en Firestore.");
            }
        });

        document.getElementById('qaCopyMonthBtn').addEventListener('click', () => {
            if (confirm("¿Copiar todas las transacciones del mes anterior al mes actual? Los montos y fechas se ajustarán.")) {
                const wallet = state.getCurrentWallet();
                if (wallet && wallet.previousMonthTransactions) {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();

                    const transactionsToCopy = wallet.previousMonthTransactions.map(tx => {
                        const prevDate = new Date(tx.date);
                        const newDate = new Date(currentYear, currentMonth, prevDate.getDate() + 1); // +1 para evitar problemas de zona horaria
                        
                        return {
                            ...tx,
                            id: Date.now() + Math.random(), // Nuevo ID único
                            date: newDate.toISOString().slice(0, 10),
                            description: `${tx.description} (Copiado)`
                        };
                    });

                    wallet.transactions.push(...transactionsToCopy);
                    saveDataToFirestore(true);
                    renderAll();
                    alert(`${transactionsToCopy.length} transacciones copiadas al mes actual.`);
                } else {
                    alert("No se encontraron transacciones en el mes anterior para copiar.");
                }
            }
        });

    } else {
        banner.classList.add('hidden');
        panel.classList.add('hidden');
    }
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("App modularizada iniciada.");
    
    // 1. Conectar con Firebase e iniciar la autenticación y carga de datos
    setupFirebase();
    
    // 2. Preparar todos los botones y listeners de la aplicación
    initializeEventListeners();

    // 3. Configurar herramientas de QA si estamos en el entorno correcto
    setupQATools();

    // Listener para guardar datos antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        if (state.saveTimeout) {
            clearTimeout(state.saveTimeout);
            saveDataToFirestore(true);
        }
    });
});

