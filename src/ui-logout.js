import { signOut } from './services/auth.js';

export function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await signOut();
      // NÃO faz nada aqui
      // O onAuthStateChange vai cuidar da UI
    } catch {
      alert('Erro ao sair');
    }
  });
}
