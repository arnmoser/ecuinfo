/* main.js - Boot + Auth Orchestration */

import { supabase } from './services/supabase.js';

import { loadFromStorage, saveToStorage } from './storage.js';
import { state } from './state.js';
import { uid } from './utils.js';

import { renderModuleList, renderCurrentModule } from './rendering.js';
import { applyTransform, setupStagePanZoom } from './stage.js';
import { setupMarkCreationEvents } from './marks.js';
import { setupGlobalEvents } from './events.js';

import { getProjects } from './services/projects.js';
import { showLoginScreen, hideLoginScreen, setupLoginForm } from './ui-login.js';
import { setupLogout } from './ui-logout.js';


/* =========================
   UI INIT (SEM AUTH)
   ========================= */
function initUI() {
  loadFromStorage();

  if (!state.modules.length) {
    state.modules = [{
      id: uid('mod'),
      name: 'Exemplo ECU',
      notes:
        'Clique em "Adicionar Foto" para carregar imagem.\n' +
        'Use ferramenta Ponto/Texto para marcar.',
      photo: '',
      marks: []
    }];
    state.currentModuleId = state.modules[0].id;
    saveToStorage();
  }

  document.getElementById('toolPoint')?.classList.add('active');

  renderModuleList();
  renderCurrentModule();
  applyTransform();

  setupGlobalEvents();
  setupStagePanZoom();
  setupMarkCreationEvents();
}

/* =========================
   AUTH ORCHESTRATION
   ========================= */
async function startApp(user) {
  state.user = user;

  hideLoginScreen();

  setupLogout();

  const { data: projects, error } = await getProjects();
  if (!error) {
    state.projects = projects || [];
  }

  initUI();
}

/* =========================
   BOOT
   ========================= */
function boot() {
  // Listener principal de auth
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      startApp(session.user);
    } else {
      showLoginScreen();
      setupLoginForm();
    }
  });

  // Estado inicial (refresh / reload)
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      startApp(data.session.user);
    } else {
      showLoginScreen();
      setupLoginForm();
    }
  });
}

boot();
