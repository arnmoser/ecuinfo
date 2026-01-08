// src/ui-toast.js

// Create a container for toasts if it doesn't exist
let toastContainer = document.getElementById('toast-container');
if (!toastContainer) {
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  document.body.appendChild(toastContainer);
}

/**
 * Shows a toast notification.
 * @param {string} message The message to display.
 * @param {object} [options] Options for the toast.
 * @param {'info' | 'success' | 'error'} [options.type='info'] The type of toast.
 * @param {number} [options.duration=4000] Duration in ms before auto-dismissal.
 */
export function showToast(message, { type = 'info', duration = 4000 } = {}) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  const typeColors = {
    info: '#3b82f6',    // blue-500
    success: '#22c55e', // green-500
    error: '#ef4444'    // red-500
  };

  toast.style.cssText = `
    background-color: ${typeColors[type]};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 0.95rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateX(calc(100% + 20px));
    transition: all 0.4s cubic-bezier(0.215, 0.610, 0.355, 1);
  `;

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  // Animate out and remove
  const dismissTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(calc(100% + 20px))';
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);

  // Allow user to dismiss by clicking
  toast.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(calc(100% + 20px))';
    toast.addEventListener('transitionend', () => toast.remove());
  }, { once: true });
}
