/* state.js - Estado global da aplicação */

export const state = {
  user: null,

  currentProjectId: null,

  modules: [],
  currentModuleId: null,

  tool: 'point',
  scale: 1,
  translate: { x: 0, y: 0 },

  dirty: false,

  draggingImage: false,
  dragStart: null,

  // 🔒 CONTROLE DE BOOT
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
  state.currentProjectId = null;

  state.modules = [];
  state.currentModuleId = null;

  state.tool = 'point';
  state.scale = 1;
  state.translate = { x: 0, y: 0 };

  state.dirty = false;
  state.draggingImage = false;
  state.dragStart = null;

  // ⚠️ CRÍTICO
  state.booting = false;
  state.bootstrapped = false;
}
