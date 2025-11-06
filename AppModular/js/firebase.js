// Importa los servicios de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa TODO el estado y los setters desde state.js
import * as state from './state.js';
// Importa las funciones de UI que necesitamos llamar desde aquí
import { initializeAppUI, renderAll } from './ui.js';

// --- CONFIG ---
// NOTE: For production, prefer injecting the config at runtime (e.g. via a server-rendered
// script that sets window.FIREBASE_CONFIG) or using environment-managed secrets.
// The inline config is kept for backwards compatibility with the current app structure.
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyASYfrRYTFb8kJ6IavGlG4_U-D9PTnvCCQ",
    authDomain: "aplicacion-de-costos-70bb2.firebaseapp.com",
    projectId: "aplicacion-de-costos-70bb2",
    storageBucket: "aplicacion-de-costos-70bb2.appspot.com",
    messagingSenderId: "54926856493",
    appId: "1:54926856493:web:cfc78a98e57a9af77343a4"
};

// --- FUNCIONES ---

export const setupFirebase = () => {
    try {
        // Allow runtime override to avoid committing secrets directly in source for production.
        const firebaseConfig = (window && window.FIREBASE_CONFIG) ? window.FIREBASE_CONFIG : DEFAULT_FIREBASE_CONFIG;
        
        const app = initializeApp(firebaseConfig);
        state.setDb(getFirestore(app));
        state.setAuth(getAuth(app));

        // Ensure auth and UI elements exist before attempting to use them
        onAuthStateChanged(state.auth, user => {
            try {
                const authScreen = document.getElementById('authScreen');
                const appContainer = document.getElementById('appContainer');

                if (user) {
                    state.setUserId(user.uid);
                    // CRITICAL FIX: No mostramos el appContainer aquí. Esperaremos a que los datos carguen.
                    // Esto previene la "condición de carrera" donde se ven los datos por defecto.

                    // Unsubscribe previous listener if present and set up a new one
                    if (typeof state.unsubscribeFromData === 'function') {
                        state.unsubscribeFromData();
                    } else if (state.unsubscribeFromData) {
                        try { state.unsubscribeFromData(); } catch (e) { /* ignore */ }
                    }
                    state.setIsInitialLoad(true);
                    listenToDataChanges();
                } else {
                    // Si no hay usuario, nos aseguramos de que se vea la pantalla de login.
                    authScreen?.classList.remove('hidden');
                    appContainer?.classList.add('hidden');

                    if (state.unsubscribeFromData) {
                        try {
                            state.unsubscribeFromData();
                        } catch (e) {
                            // ignore errors from unsubscribe
                        }
                        state.setUnsubscribeFromData(null);
                    }
                }
            } catch (innerErr) {
                console.error('Error handling auth state change:', innerErr);
            }
        });
    } catch (error) {
        // Do not expose raw error content to end users, keep logged for developer debugging.
        console.error("Firebase initialization failed:", error);
        try { alert("Error inicializando la aplicación. Comprueba la consola para más detalles."); } catch (e) { /* ignore if alert not available */ }
    }
};

const listenToDataChanges = () => {
    if (!state.userId || !state.db) return;
    const docRef = doc(state.db, `users/${state.userId}/appData`, "main");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        try {
            if (docSnap.exists()) {
                // Data loaded
                loadAppData(docSnap.data());
            } else {
                // No data for this user, initialize with defaults
                loadAppData(state.defaultData, true);
            }
        } catch (err) {
            console.error('Error processing snapshot data:', err);
        }
    }, (error) => {
        console.error("Error listening to Firestore:", error);
        try { alert("Error al cargar los datos desde la base de datos. Revisa la consola para detalles."); } catch (e) { /* ignore */ }
    });

    state.setUnsubscribeFromData(unsubscribe);
};

const loadAppData = (data = {}, isNewUser = false) => {
    // Guard against undefined properties in saved data
    state.setWallets(data.wallets ?? state.defaultData.wallets);
    state.setCurrentWalletId(data.currentWalletId ?? state.defaultData.currentWalletId);
    state.setGeminiApiKey(data.geminiApiKey ?? '');
    state.setExchangeRates(data.exchangeRates ?? (state.defaultData.exchangeRates ?? { USD: 950, UF: 0, lastUpdated: null }));
    
    // Previous fix is maintained: No automatic saving for new users.
    // if (isNewUser) {
    //     saveDataToFirestore(true);
    // }

    if (state.isInitialLoad) {
        initializeAppUI();
        state.setIsInitialLoad(false);

        // CRITICAL FIX: Ahora que los datos están cargados y la UI inicializada,
        // cambiamos la visibilidad de las pantallas.
        document.getElementById('authScreen')?.classList.add('hidden');
        document.getElementById('appContainer')?.classList.remove('hidden');

    } else {
        renderAll();
    }
};

export const saveDataToFirestore = async (immediate = false) => {
    if (!state.db || !state.userId) return;
    const appData = { 
        wallets: state.wallets, 
        currentWalletId: state.currentWalletId, 
        geminiApiKey: state.geminiApiKey, 
        exchangeRates: state.exchangeRates 
    };
    const docRef = doc(state.db, `users/${state.userId}/appData`, "main");

    const saveAction = async () => {
        try {
            await setDoc(docRef, appData, { merge: true });
        } catch (error) {
            console.error("Error saving data to Firestore:", error);
        }
    };
    
    if (state.saveTimeout) {
        clearTimeout(state.saveTimeout);
    }

    if (immediate) {
        await saveAction();
    } else {
        const timeout = setTimeout(() => {
            saveAction().catch(() => { /* ignore */ });
        }, 1000);
        state.setSaveTimeout(timeout);
    }
};

export const updateDataInFirestore = async () => {
    await saveDataToFirestore(true);
};
