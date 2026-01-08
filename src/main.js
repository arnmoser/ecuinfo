import { supabase } from './services/supabase.js';
import { handleAuthEvent } from './authController.js';
import { showLoginScreen, setupAuthForms, showAuthScreen } from './ui-login.js';
import { setupLogout } from './ui-logout.js';

/**
 * Decide qual tela de autenticação mostrar com base nos parâmetros da URL.
 * Isso permite que links externos (como da landing page) especifiquem
 * se o usuário pretende fazer login ou se registrar.
 */
function routeInitialAuthScreen() {
  const urlParams = new URLSearchParams(window.location.search);
  const intent = urlParams.get('intent');

  // Se a intenção for 'register', mostra a tela de registro.
  // Caso contrário, o padrão é mostrar a tela de login.
  if (intent === 'register') {
    showAuthScreen('register');
  } else {
    showLoginScreen();
  }
}

function boot() {
  // Decide qual tela mostrar antes de configurar os formulários
  routeInitialAuthScreen();
  setupAuthForms();
  setupLogout();

  // Escuta as mudanças de estado de autenticação (login, logout)
  supabase.auth.onAuthStateChange((event, session) => {
    handleAuthEvent(event, session);
  });
}

// Botão Gerenciar Assinatura
document.getElementById('manageSubscriptionBtn').addEventListener('click', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    showToast('Você precisa estar logado para gerenciar a assinatura.', { type: 'error' });
    return;
  }

  // Mostra loading (opcional)
  const btn = document.getElementById('manageSubscriptionBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Carregando...';

  try {
    const res = await fetch('https://tyxjiyttkkpicmxzwjhr.supabase.co/functions/v1/create-portal-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
      showToast(error.message || 'Não foi possível abrir o portal de assinatura.', { type: 'error' });
      return;
    }

    const { url } = await res.json();
    window.location.href = url;  // Redireciona para o Customer Portal do Stripe
  } catch (err) {
    showToast('Erro de conexão. Tente novamente.', { type: 'error' });
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// Função toast simples (sem depender de biblioteca externa)
function showToast(message, options = {}) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${options.type === 'error' ? '#e74c3c' : '#2ecc71'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: fadein 0.3s, fadeout 0.3s 2.7s;
  `;

  document.body.appendChild(toast);

  // Animações
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadein { from { opacity: 0; bottom: 0; } to { opacity: 1; bottom: 20px; } }
    @keyframes fadeout { from { opacity: 1; } to { opacity: 0; } }
  `;
  document.head.appendChild(style);

  // Remove após 3 segundos
  setTimeout(() => {
    toast.remove();
    style.remove();
  }, 3000);
}

// Inicia a aplicação
boot();
