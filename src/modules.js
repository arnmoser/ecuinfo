/* modules.js - Gerenciamento de Módulos (CRUD) */
import { state, getCurrentModule } from './state.js';
import { uid } from './utils.js';
import { saveToStorage } from './storage.js';
import { renderModuleList, renderCurrentModule } from './rendering.js';
import { syncSaveButton } from './ui-modal.js';

export function createModule(){
  const m = {
    id: uid('mod'),
    name: 'Novo Módulo',
    notes: '',
    photo: '', // base64 or empty
    marks: [] // mark objects
  };
  state.modules.unshift(m);
  state.currentModuleId = m.id;
  state.dirty = true;
  syncSaveButton();
  renderModuleList();
  renderCurrentModule();
}

export function deleteCurrentModule(){
  if(!state.currentModuleId) return;
  const idx = state.modules.findIndex(m=>m.id===state.currentModuleId);
  if(idx>=0){
    if(!confirm('Deletar módulo selecionado?')) return;
    state.modules.splice(idx,1);
    state.currentModuleId = state.modules[0] ? state.modules[0].id : null;
    state.dirty = true;
    syncSaveButton();
    renderModuleList();
    renderCurrentModule();
  }
}