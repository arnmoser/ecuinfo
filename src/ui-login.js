import { signInWithEmail } from './services/auth.js';

function getUI() {
  return {
    login: document.getElementById('login'),
    app: document.getElementById('app')
  };
}

export function showLoginScreen() {
  const { login, app } = getUI();
  if (!login || !app) return;

  login.classList.remove('hidden');
  app.classList.add('hidden');
}

export function hideLoginScreen() {
  const { login, app } = getUI();
  if (!login || !app) return;

  login.classList.add('hidden');
  app.classList.remove('hidden');
}

export function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      await signInWithEmail(form.email.value, form.password.value);
    } catch {
      alert('Email ou senha inválidos');
    }
  });
}
