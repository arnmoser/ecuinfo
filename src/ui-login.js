import { signInWithEmail, signUpNewUser } from './services/auth.js';

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
      await signInWithEmail(loginForm.email.value, loginForm.password.value);
    } catch {
      alert('Email ou senha inválidos');
    }
  });

  // --- Lógica do formulário de Registro ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const passwordConfirm = registerForm.passwordConfirm.value;

    if (password !== passwordConfirm) {
      alert('As senhas não conferem.');
      return;
    }

    try {
      const { error } = await signUpNewUser(email, password);
      if (error) {
        alert(`Erro no registro: ${error.message}`);
      } else {
        // A função signUpNewUser já mostra um alerta de sucesso
        registerForm.reset();
        // Volta para a tela de login
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    } catch (err) {
      alert('Ocorreu um erro inesperado. Tente novamente.');
      console.error(err);
    }
  });
}
