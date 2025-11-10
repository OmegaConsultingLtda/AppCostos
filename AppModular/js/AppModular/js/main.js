// main.js

import * as state from './state.js';
import { setupFirebase, saveDataToFirestore } from './firebase.js';
import { initializeEventListeners } from './handlers.js';

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("App modularizada iniciada.");
    
    // 1. Conectar con Firebase e iniciar la autenticación y carga de datos
    setupFirebase();
    
    // 2. Preparar todos los botones y listeners de la aplicación
    initializeEventListeners();

    // Listener para guardar datos antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        if (state.saveTimeout) {
            clearTimeout(state.saveTimeout);
            saveDataToFirestore(true);
        }
    });
});

