import { signInWithEmail, signUpNewUser } from './services/auth.js';
import { showToast } from './ui-toast.js';
import {
  buildAcceptancePayload,
  getCurrentLegalVersions,
  formatLegalDate,
  savePendingLegalAcceptance
} from './services/legalService.js';

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
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

    try {
      submitButton.disabled = true;
      submitButton.textContent = 'Entrando...';
      await signInWithEmail(email, password);
    } catch (error) {
      console.error('[Login Error]', error);

      const { message } = error;
      let userMessage = 'Ocorreu um erro inesperado. Tente novamente.';

      // Mapeamento de erros da API do Supabase
      if (message.includes('Invalid login credentials')) {
        userMessage = 'Email ou senha inválidos.';
      } else if (message.includes('Email not confirmed')) {
        userMessage = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
      } else if (message.includes('rate limit exceeded')) {
        userMessage = 'Muitas tentativas de login. Tente novamente em alguns minutos.';
      } else if (error.name === 'TypeError' || message.includes('fetch')) {
        userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      showToast(userMessage, { type: 'error' });
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Entrar';
    }
  });

  // --- Lógica do formulário de Registro ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // TODO: Adicionar feedback de "carregando" no botão
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const passwordConfirm = registerForm.passwordConfirm.value;
    const acceptLegal = registerForm.acceptLegal;

    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres.', { type: 'error' });
      return;
    }

    if (password !== passwordConfirm) {
      showToast('As senhas não coincidem.', { type: 'error' });
    return;
  }

    if (!acceptLegal?.checked) {
      showToast('VocÇ¦ precisa aceitar os Termos de Uso e a PolÇðtica de Privacidade.', { type: 'error' });
      const warning = document.getElementById('legalWarning');
      const consentLabel = registerForm?.querySelector('.legal-consent');
      if (warning) {
        warning.classList.remove('hidden');
        warning.classList.add('is-visible');
      }
      if (consentLabel) {
        consentLabel.classList.add('error');
      }
      acceptLegal?.focus();
      return;
    }

  try {
    const legalVersions = await getCurrentLegalVersions();
    const legalPayload = buildAcceptancePayload(legalVersions);
    const { error } = await signUpNewUser(email, password, legalPayload);
    if (error) {
      showToast(`Erro no registro: ${error.message}`, { type: 'error' });
      } else {
        savePendingLegalAcceptance(legalPayload);
        showToast('Registro realizado! Verifique seu e-mail para confirmar a conta.', { type: 'success', duration: 6000 });
        registerForm.reset();
        if (acceptLegal) {
          acceptLegal.checked = false;
          const submitBtn = registerForm.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.disabled = true;
        }
        // Volta para a tela de login
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    } catch (err) {
      showToast('Ocorreu um erro inesperado. Tente novamente.', { type: 'error' });
      console.error(err);
    }
  });

  hydrateLegalConsentUI(registerForm);
}

async function hydrateLegalConsentUI(registerForm) {
  const acceptLegal = registerForm?.acceptLegal;
  const submitBtn = registerForm?.querySelector('button[type="submit"]');
  const legalMeta = document.getElementById('registerLegalMeta');

  if (!acceptLegal || !submitBtn) return;

  const syncButton = () => {
    submitBtn.disabled = !acceptLegal.checked;
  };

  acceptLegal.addEventListener('change', () => {
    syncButton();
    const warning = document.getElementById('legalWarning');
    const consentLabel = registerForm?.querySelector('.legal-consent');
    if (warning) {
      warning.classList.add('hidden');
      warning.classList.remove('is-visible');
    }
    if (consentLabel) {
      consentLabel.classList.remove('error');
    }
  });
  syncButton();

  const legalVersions = await getCurrentLegalVersions();
  if (legalMeta) {
    const termsDate = formatLegalDate(legalVersions.terms_effective_at);
    const privacyDate = formatLegalDate(legalVersions.privacy_effective_at);
    legalMeta.textContent = `Versao vigente: Termos ${legalVersions.terms_version} (${termsDate}) | Politica ${legalVersions.privacy_version} (${privacyDate})`;
  }
}

/**
 * Exibe a tela de autenticação e decide qual formulário mostrar.
 * @param {'login' | 'register'} intent - Qual formulário exibir.
 */
export function showAuthScreen(intent = 'login') {
  const { loginWrapper, app, loginForm, registerForm } = getUI();
  if (!loginWrapper || !app || !loginForm || !registerForm) return;

  if (intent === 'register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  } else {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  }

  // Garante que o container de autenticação geral esteja visível
  loginWrapper.classList.remove('hidden');
  app.classList.add('hidden');
}
