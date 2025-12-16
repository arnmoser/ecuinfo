/* state.js - Estado global da aplicação */
export let state = {
  modules: [],
  currentModuleId: null,
  tool: 'point', // 'point' or 'text'
  scale: 1,
  translate: { x: 0, y: 0 },
  draggingImage: false,
  dragStart: null
};

// Getter auxiliar para obter o módulo atual com segurança
export function getCurrentModule(){
  return state.modules.find(m => m.id === state.currentModuleId) || null;
}