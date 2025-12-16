/* storage.js - Persistência de dados */
import { STORAGE_KEY, LAST_MODULE_KEY } from './constants.js';
import { state } from './state.js';

export function loadFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      state.modules = JSON.parse(raw).modules || [];
    } else {
      state.modules = [];
    }
    const last = localStorage.getItem(LAST_MODULE_KEY);
    if(last) state.currentModuleId = last;
    if(!state.currentModuleId && state.modules[0]) state.currentModuleId = state.modules[0].id;
  }catch(e){
    console.error('Erro ao carregar storage', e);
    state.modules = [];
  }
}

export function saveToStorage(){
  const payload = { modules: state.modules };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if(state.currentModuleId) localStorage.setItem(LAST_MODULE_KEY, state.currentModuleId);
  } catch(e){
    console.error('Erro ao salvar', e);
  }
}