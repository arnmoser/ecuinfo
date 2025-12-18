import { signInWithEmail } from './services/auth.js';

// Mostra tela de login
export function showLoginScreen() {
  if (!login || !app) {
    console.error('[ui-login] #login ou #app não encontrados');
    return;
  }

  login.classList.remove('hidden');
  app.classList.add('hidden');
}


// Esconde login
export function hideLoginScreen() {
  if (!login || !app) return;

  login.classList.add('hidden');
  app.classList.remove('hidden');
}
// Lógica do formulário
export function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.email.value;
    const password = form.password.value;

    try {
      await signInWithEmail(email, password);
      window.location.reload(); // simples e robusto
    } catch {
      alert('Email ou senha inválidos');
    }
  });
}
