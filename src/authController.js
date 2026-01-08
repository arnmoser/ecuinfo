import { state, resetState } from './state.js';
import { loadOrCreateUserProject } from './services/supabaseStorage.js';
import { showToast } from './ui-toast.js';
import { hydrateStateFromPayload } from './services/hydrate.js';
import { hideLoginScreen, showLoginScreen } from './ui-login.js';
import { initUI } from './main-ui.js';
import { setupLogout } from './ui-logout.js';
import { loadAccount } from './services/accountService.js';
import { supabase } from './services/supabase.js';

// Canal para sincronização entre abas
const authChannel = new BroadcastChannel('ecuinfo-auth-channel');

// Listener para forçar reload em eventos de outras abas
authChannel.onmessage = (event) => {
  if (event.data?.type === 'SIGNED_OUT' || event.data?.type === 'RELOAD_STATUS') {
    // Recarregar a página é a forma mais robusta de garantir um estado limpo.
    window.location.reload();
  }
};

export async function handleAuthEvent(event, session) {
  if (event === 'SIGNED_OUT' || !session) {
    // Notifica outras abas sobre o logout
    authChannel.postMessage({ type: 'SIGNED_OUT' });
    resetState();
    showLoginScreen();
    return;
  }

  // O evento INITIAL_SESSION é disparado no primeiro carregamento, é um bom momento para iniciar
  if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') return;

  await bootstrapUser(session);
}

async function bootstrapUser(session) {
  if (!session?.user) return;
  if (state.bootstrapped || state.booting) return;

  state.booting = true;
  state.user = session.user;

  try {
    // 1. Carrega dados da conta
    const account = await loadAccount(session.user.id);

    // 2. Verifica se tem acesso ativo (demo válido OU subscription active)
    const { data: accessData, error } = await supabase
      .from('account_access')
      .select('has_access')
      .eq('owner_user_id', session.user.id)
      .single();

    if (error || !accessData?.has_access) {
      // Conta expirada ou demo encerrado → bloqueia app
      state.account = account; // mantém para mostrar mensagem se quiser
      showAccessBlockedScreen(account);
      return;
    }

    // 3. Tem acesso → entra no app normalmente
    hideLoginScreen();

    state.account = account;

    const project = await loadOrCreateUserProject();
    state.currentProjectId = project.id;

    hydrateStateFromPayload(project.data);
    initUI();
    setupLogout();

    state.bootstrapped = true;
  } catch (err) {
    console.error('Erro no bootstrap:', err);
    showToast('Erro ao carregar sua conta. Tente novamente.', { type: 'error' });
    await supabase.auth.signOut();
  } finally {
    state.booting = false;
  }
}

function showAccessBlockedScreen(account) {
  hideLoginScreen(); // esconde login

  // Cria tela de bloqueio simples (pode estilizar depois)
  document.body.insertAdjacentHTML('beforeend', `
    <div id="access-blocked" style="
      position: fixed;
      inset: 0;
      background: #111;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      font-family: system-ui, sans-serif;
      z-index: 9999;
    ">
      <h1>🔒 Acesso Pausado</h1>
      <p>Seu período de teste de 7 dias terminou.</p>
      <p>Seus projetos estão salvos e seguros.</p>
      <p>Para continuar usando o ECU Info, escolha um plano:</p>
      <div style="margin: 2rem 0; display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
        <button onclick="location.href='/remarketing.html'" style="padding: 1rem 2rem; font-size: 1.1rem; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Ver Planos e Reativar
        </button>
        <button onclick="supabase.auth.signOut()" style="padding: 1rem 2rem; font-size: 1.1rem; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Sair
        </button>
      </div>
      <small>Obrigado por testar o ECU Info!</small>
    </div>
  `);
}