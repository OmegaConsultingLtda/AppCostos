// main.js

import { setupFirebase, saveDataToFirestore } from './firebase.js';
import { initializeEventListeners } from './handlers.js';
import * as state from './state.js';

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // App started — avoid noisy console output in production
    try {
        // 1. Conectar con Firebase e iniciar la autenticación y carga de datos
        if (typeof setupFirebase === 'function') {
            setupFirebase();
        }

        // 2. Preparar todos los botones y listeners de la aplicación
        if (typeof initializeEventListeners === 'function') {
            initializeEventListeners();
        }
    } catch (err) {
        // Keep an error log to help debugging but avoid leaking sensitive data
        console.error('Initialization error in main.js:', err);
    }

    // Listener para guardar datos antes de cerrar la página (mejor intento)
    window.addEventListener('beforeunload', () => {
        try {
            if (state.saveTimeout) {
                clearTimeout(state.saveTimeout);
            }
            if (typeof saveDataToFirestore === 'function') {
                // Call best-effort save; note: async saves may not complete during unload
                saveDataToFirestore(true);
            }
        } catch (err) {
            // Don't block unload on errors
            /* intentionally empty */
        }
    });
});
