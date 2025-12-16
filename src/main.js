/* main.js - Inicialização da aplicação */
import { loadFromStorage, saveToStorage } from './storage.js';
import { state } from './state.js';
import { uid } from './utils.js';
import { renderModuleList, renderCurrentModule } from './rendering.js';
import { applyTransform, setupStagePanZoom } from './stage.js';
import { setupMarkCreationEvents } from './marks.js';
import { setupGlobalEvents } from './events.js';
import { toolPointBtn } from './dom.js'; // To force active class on init if needed

function init(){
  loadFromStorage();
  if(!state.modules.length){
    // seed a starter module to show UX
    state.modules = [{
      id: uid('mod'),
      name: 'Exemplo ECU',
      notes: 'Clique em "Adicionar Foto" para carregar imagem.\nUse ferramenta Ponto/Texto para marcar.',
      photo: '',
      marks: []
    }];
    state.currentModuleId = state.modules[0].id;
    saveToStorage();
  }
  
  // Set initial tool UI state manually since logic is inside events closure
  document.getElementById('toolPoint').classList.add('active');
  
  renderModuleList();
  renderCurrentModule();
  applyTransform();
  
  // Setup listeners
  setupGlobalEvents();
  setupStagePanZoom();
  setupMarkCreationEvents();
}

// Iniciar
init();