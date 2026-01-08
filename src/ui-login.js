import { signInWithEmail, signUpNewUser } from './services/auth.js';
import { showToast } from './ui-toast.js';

function getUI() {
  return {
    loginWrapper: document.getElementById('login'),
    app: document.getElementById('app'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    showRegisterBtn: document.getElementById('showRegister'),
    showLoginBtn: document.getElementById('showLogin'),
  };
}

export function showLoginScreen() {
  const { loginWrapper, app } = getUI();
  if (!loginWrapper || !app) return;

  loginWrapper.classList.remove('hidden');
  app.classList.add('hidden');
}

export function hideLoginScreen() {
  const { loginWrapper, app } = getUI();
  if (!loginWrapper || !app) return;

  loginWrapper.classList.add('hidden');
  app.classList.remove('hidden');
}

export function setupAuthForms() {
  const {
    loginForm,
    registerForm,
    showRegisterBtn,
    showLoginBtn
  } = getUI();

  if (!loginForm || !registerForm || !showRegisterBtn || !showLoginBtn) {
    console.error('Elementos do formulário de autenticação não encontrados.');
    return;
  }

  // --- Lógica para alternar entre forms ---
  showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });

  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // --- Lógica do formulário de Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      // TODO: Adicionar feedback de "carregando" no botão
      await signInWithEmail(loginForm.email.value, loginForm.password.value);
    } catch {
      showToast('Email ou senha inválidos.', { type: 'error' });
    }
  });

  // --- Lógica do formulário de Registro ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // TODO: Adicionar feedback de "carregando" no botão
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const passwordConfirm = registerForm.passwordConfirm.value;

    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres.', { type: 'error' });
      return;
    }

    if (password !== passwordConfirm) {
      showToast('As senhas não coincidem.', { type: 'error' });
      return;
    }

    try {
      const { error } = await signUpNewUser(email, password);
      if (error) {
        showToast(`Erro no registro: ${error.message}`, { type: 'error' });
      } else {
        showToast('Registro realizado! Verifique seu e-mail para confirmar a conta.', { type: 'success', duration: 6000 });
        registerForm.reset();
        // Volta para a tela de login
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    } catch (err) {
      showToast('Ocorreu um erro inesperado. Tente novamente.', { type: 'error' });
      console.error(err);
    }
  });
}
