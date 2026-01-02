/* state.js - Estado global da aplicação */

export const state = {
  user: null,

  account: null, 

  currentProjectId: null,

  modules: [],
  currentModuleId: null,

  tool: 'point',
  scale: 1,
  translate: { x: 0, y: 0 },

  dirty: false,

  draggingImage: false,
  dragStart: null,

  bootstrapped: false,
  booting: false
};

/* ======================
   GETTERS AUXILIARES
   ====================== */
export function getCurrentModule() {
  return (
    state.modules.find(m => m.id === state.currentModuleId) || null
  );
}

export function resetState() {
  state.user = null;
  state.account = null;

  state.currentProjectId = null;
  state.modules = [];
  state.currentModuleId = null;

  state.tool = 'point';
  state.scale = 1;
  state.translate = { x: 0, y: 0 };

  state.dirty = false;
  state.draggingImage = false;
  state.dragStart = null;

  state.booting = false;
  state.bootstrapped = false;
}


state.account = {
  status: 'demo' | 'active' | 'expired',
  demo_expires_at: null,
  ecuPacks: [],
  usage: {
    projects: 0,
    uploads: 0,
    comparisons: 0
  }
};
