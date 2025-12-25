/* main.js - Boot + Auth Orchestration (CORRIGIDO) */

import { supabase } from './services/supabase.js';

import { loadFromStorage } from './storage.js';
import { state } from './state.js';
import { uid } from './utils.js';

import {
  renderModuleList,
  renderCurrentModule
} from './rendering.js';

import {
  applyTransform,
  setupStagePanZoom
} from './stage.js';

import { setupMarkCreationEvents } from './marks.js';
import { setupGlobalEvents } from './events.js';

import { getProjects } from './services/projects.js';
import {
  showLoginScreen,
  hideLoginScreen,
  setupLoginForm
} from './ui-login.js';

import { setupLogout } from './ui-logout.js';
import { syncSaveButton } from './ui-modal.js';

/* =========================
   INTERNAL FLAGS
   ========================= */

let appStarted = false;

/* =========================
   STATE RESET (LOGOUT SAFE)
   ========================= */

function resetStateOnLogout() {
  state.user = null;

  state.projects = [];
  state.currentProjectId = null;

  state.modules = [];
  state.currentModuleId = null;

  state.tool = 'point';
  state.scale = 1;
  state.translate = { x: 0, y: 0 };

  state.dirty = false;
  state.draggingImage = false;
  state.dragStart = null;
}

/* =========================
   UI INIT (NO AUTH LOGIC)
   ========================= */

function initUI() {
  loadFromStorage();

  if (!state.modules.length) {
    state.modules = [
      {
        id: uid('mod'),
        name: 'Exemplo ECU',
        notes:
          'Clique em "Adicionar Foto" para carregar imagem.\n' +
          'Use ferramenta Ponto/Texto para marcar.',
        photo: '',
        marks: []
      }
    ];

    state.currentModuleId = state.modules[0].id;
    state.dirty = true;
    syncSaveButton();
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
   APP START (AUTH OK)
   ========================= */

async function startApp(user) {
  if (appStarted) return;
  appStarted = true;

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
   AUTH HANDLERS
   ========================= */

function handleAuthSession(session) {
  if (session?.user) {
    startApp(session.user);
  } else {
    appStarted = false;
    resetStateOnLogout();
    showLoginScreen();
    setupLoginForm();
  }
}

/* =========================
   BOOTSTRAP
   ========================= */

function boot() {
  // Reação a login/logout
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthSession(session);
  });

  // Estado inicial (refresh / reload)
  supabase.auth
    .getSession()
    .then(({ data }) => {
      handleAuthSession(data.session);
    })
    .catch(() => {
      handleAuthSession(null);
    });
}

boot();
