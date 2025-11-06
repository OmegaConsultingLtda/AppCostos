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
                    // Keep console.debug/info (not noisy) for debugging; comment/uncomment as needed
                    // console.debug("Authenticated User ID:", state.userId);

                    authScreen?.classList.add('hidden');
                    appContainer?.classList.remove('hidden');

                    // Unsubscribe previous listener if present and set up a new one
                    if (typeof state.unsubscribeFromData === 'function') {
                        state.unsubscribeFromData();
                    } else if (state.unsubscribeFromData) {
                        // If unsubscribe is a stored function reference, call it; otherwise clear value
                        try { state.unsubscribeFromData(); } catch (e) { /* ignore */ }
                    }
                    state.setIsInitialLoad(true);
                    listenToDataChanges();
                } else {
                    // console.debug("User is not signed in.");
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
        // Friendly message for users; avoid showing raw error objects.
        // Consider replacing this with a UI banner in the future.
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
                // No data for this user, initialize with defaults but DO NOT SAVE automatically
                loadAppData(state.defaultData, true);
            }
        } catch (err) {
            console.error('Error processing snapshot data:', err);
        }
    }, (error) => {
        console.error("Error listening to Firestore:", error);
        // Avoid repeated blocking alerts; use a single user-friendly message.
        try { alert("Error al cargar los datos desde la base de datos. Revisa la consola para detalles."); } catch (e) { /* ignore */ }
    });

    // Store the unsubscribe function via setter for consistent state handling
    if (typeof state.setUnsubscribeFromData === 'function') {
        state.setUnsubscribeFromData(unsubscribe);
    } else {
        state.unsubscribeFromData = unsubscribe;
    }
};

const loadAppData = (data = {}, isNewUser = false) => {
    // Guard against undefined properties in saved data
    state.setWallets(data.wallets ?? state.defaultData.wallets);
    state.setCurrentWalletId(data.currentWalletId ?? state.defaultData.currentWalletId);
    state.setGeminiApiKey(data.geminiApiKey ?? '');
    state.setExchangeRates(data.exchangeRates ?? (state.defaultData.exchangeRates ?? { USD: 950, UF: 0, lastUpdated: null }));
    
    // CRITICAL FIX: Removed automatic saving for new users to prevent data overwrite
    // on environment mismatches or race conditions. Data will only be saved on explicit user action.
    // if (isNewUser) {
    //     saveDataToFirestore(true); // <--- THIS LINE WAS DELETING THE DATA
    // }

    if (state.isInitialLoad) {
        initializeAppUI();
        state.setIsInitialLoad(false);
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
            // console.debug("Data saved successfully to Firestore.");
        } catch (error) {
            console.error("Error saving data to Firestore:", error);
        }
    };
    
    // Clear previous timeout safely
    try {
        if (typeof state.saveTimeout !== 'undefined' && state.saveTimeout !== null) {
            clearTimeout(state.saveTimeout);
        }
    } catch (e) {
        // ignore errors from clearTimeout
    }

    if (immediate) {
        // Wait for the save to complete so callers can await this function if needed
        await saveAction();
    } else {
        const timeout = setTimeout(() => {
            // fire-and-forget background save
            saveAction().catch(() => { /* swallow to avoid unhandled rejections */ });
        }, 1000);
        if (typeof state.setSaveTimeout === 'function') {
            state.setSaveTimeout(timeout);
        } else {
            state.saveTimeout = timeout;
        }
    }
};

export const updateDataInFirestore = async () => {
    // Provide a promise so callers can wait for completion if desired
    await saveDataToFirestore(true);
};
