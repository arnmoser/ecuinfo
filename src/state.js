/* state.js - Estado global da aplicação */

export const state = {
  /* ======================
     AUTH / SUPABASE
     ====================== */
  user: null,

  projects: [],
  currentProjectId: null,

  /* ======================
     APP LOCAL (LEGADO)
     ====================== */
  modules: [],
  currentModuleId: null,

  tool: 'point', // 'point' | 'text'
  scale: 1,
  translate: { x: 0, y: 0 },

  draggingImage: false,
  dragStart: null
};

/* ======================
   GETTERS AUXILIARES
   ====================== */
export function getCurrentModule() {
  return (
    state.modules.find(m => m.id === state.currentModuleId) || null
  );
}
