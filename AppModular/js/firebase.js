// Importa los servicios de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa TODO el estado y los setters desde state.js
import * as state from './state.js';
// Importa las funciones de UI que necesitamos llamar desde aquí
import { initializeAppUI, renderAll } from './ui.js';

// --- FUNCIONES ---

export const setupFirebase = () => {
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyASYfrRYTFb8kJ6IavGlG4_U-D9PTnvCCQ",
            authDomain: "aplicacion-de-costos-70bb2.firebaseapp.com",
            projectId: "aplicacion-de-costos-70bb2",
            storageBucket: "aplicacion-de-costos-70bb2.appspot.com",
            messagingSenderId: "54926856493",
            appId: "1:54926856493:web:cfc78a98e57a9af77343a4"
        };
        
        const app = initializeApp(firebaseConfig);
        state.setDb(getFirestore(app));
        state.setAuth(getAuth(app));

        onAuthStateChanged(state.auth, user => {
            const authScreen = document.getElementById('authScreen');
            const appContainer = document.getElementById('appContainer');

            if (user) {
                state.setUserId(user.uid);
                console.log("Authenticated User ID:", state.userId);
                
                authScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');

                if(state.unsubscribeFromData) state.unsubscribeFromData();
                state.setIsInitialLoad(true);
                listenToDataChanges();
            } else {
                console.log("User is not signed in.");
                
                authScreen.classList.remove('hidden');
                appContainer.classList.add('hidden');

                if (state.unsubscribeFromData) {
                    state.unsubscribeFromData();
                    state.setUnsubscribeFromData(null);
                }
            }
        });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        alert("Error crítico: La configuración de Firebase no es válida.");
    }
};

const listenToDataChanges = () => {
    if (!state.userId) return;
    const docRef = doc(state.db, `users/${state.userId}/appData`, "main");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            console.log("Data loaded from Firestore.");
            loadAppData(docSnap.data());
        } else {
            console.log("No data found for this user. Initializing with defaults.");
            loadAppData(state.defaultData, true);
        }
    }, (error) => {
        console.error("Error listening to Firestore:", error);
        alert("Error al cargar los datos desde la base de datos: " + error.message);
    });
    state.setUnsubscribeFromData(unsubscribe);
};

const loadAppData = (data, isNewUser = false) => {
    state.setWallets(data.wallets);
    state.setCurrentWalletId(data.currentWalletId);
    state.setGeminiApiKey(data.geminiApiKey);
    state.setExchangeRates(data.exchangeRates || { USD: 950, UF: 0, lastUpdated: null });
    
    if (isNewUser) {
        saveDataToFirestore(true);
    }

    if (state.isInitialLoad) {
        initializeAppUI();
        state.setIsInitialLoad(false);
    } else {
        renderAll();
    }
};

export const saveDataToFirestore = (immediate = false) => {
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
            console.log("Data saved successfully to Firestore.");
        } catch (error) {
            console.error("CRITICAL: Error saving data to Firestore: ", error);
        }
    };
    
    clearTimeout(state.saveTimeout);

    if (immediate) {
        saveAction();
    } else {
        const timeout = setTimeout(saveAction, 1000);
        state.setSaveTimeout(timeout);
    }
};

export const updateDataInFirestore = async () => {
    saveDataToFirestore(true);
};
