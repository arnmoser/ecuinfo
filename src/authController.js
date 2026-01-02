import { state, resetState } from './state.js';
import { loadOrCreateUserProject } from './services/supabaseStorage.js';
import { hydrateStateFromPayload } from './services/hydrate.js';
import { hideLoginScreen, showLoginScreen } from './ui-login.js';
import { initUI } from './main-ui.js';
import { setupLogout } from './ui-logout.js';

export async function handleAuthEvent(event, session) {
 if (event === 'SIGNED_OUT' || !session) {
  resetState();
  showLoginScreen();
  return;
}

  if (event !== 'SIGNED_IN') return;

  await bootstrapUser(session);
}

async function bootstrapUser(session) {
  if (!session?.user) return;
  if (state.bootstrapped || state.booting) return;

  state.booting = true;
  state.user = session.user;

  try {
    hideLoginScreen();

    const project = await loadOrCreateUserProject();
    state.currentProjectId = project.id;

    hydrateStateFromPayload(project.data);
    initUI();
    setupLogout(); // ← AQUI, NO MOMENTO CERTO

    state.bootstrapped = true;
  } finally {
    state.booting = false;
  }
}
