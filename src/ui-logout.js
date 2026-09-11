import { signOut } from './services/auth.js';
import { showToast } from './ui-toast.js';

export function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await signOut();
      // NÃO faz nada aqui
      // O onAuthStateChange vai cuidar da UI
    } catch {
      showToast('Erro ao sair. Tente novamente.', { type: 'error' });
    }
  });
}
