// --- Modal Handling ---
export const setupModals = () => {
    // Close modals when clicking outside or on close button
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('cancel-btn')) {
                closeModal(modal);
            }
        });
    });

    // Close buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-backdrop');
            if (modal) closeModal(modal);
        });
    });
};

export const closeModal = (modal) => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) form.reset();
};

export const showModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};