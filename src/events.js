/* events.js - Configuração de Event Listeners Globais */
import { 
  newModuleBtn, deleteModuleBtn, toolPointBtn, toolTextBtn, 
  photoInput, exportBtn, importInput, moduleNameInput, moduleNotesInput,
  moduleSearch, quickSearch
} from './dom.js';
import { createModule, deleteCurrentModule } from './modules.js';
import { state, getCurrentModule } from './state.js';
import { fileToDataURL } from './utils.js';
import { saveToStorage } from './storage.js';
import { renderCurrentModule, renderModuleList, renderMarks } from './rendering.js';

export function setupGlobalEvents(){
  
  newModuleBtn.addEventListener('click', createModule);
  deleteModuleBtn.addEventListener('click', deleteCurrentModule);

  /* TOOL HANDLERS */
  toolPointBtn.addEventListener('click', ()=> setTool('point'));
  toolTextBtn.addEventListener('click', ()=> setTool('text'));

  function setTool(t){
    state.tool = t;
    toolPointBtn.classList.toggle('active', t==='point');
    toolTextBtn.classList.toggle('active', t==='text');
  }

  /* IMAGE UPLOAD & SAVE */
  photoInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const data = await fileToDataURL(f);
    const mod = getCurrentModule();
    if(!mod) return alert('Selecione um módulo antes de adicionar foto.');
    mod.photo = data;
    saveToStorage();
    renderCurrentModule();
    photoInput.value = '';
  });

  /* EXPORT / IMPORT */
  exportBtn.addEventListener('click', ()=>{
    const payload = { modules: state.modules.slice() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mini-ecu-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    try{
      const text = await f.text();
      const parsed = JSON.parse(text);
      if(!Array.isArray(parsed.modules)) throw new Error('Formato inválido');
      // merge or replace? we'll replace and set as new store
      state.modules = parsed.modules;
      state.currentModuleId = state.modules[0] ? state.modules[0].id : null;
      saveToStorage();
      renderModuleList();
      renderCurrentModule();
      importInput.value = '';
      alert('Importação concluída.');
    }catch(err){
      alert('Falha ao importar: ' + err.message);
    }
  });

  /* QUICK EDITS -> name & notes */
  moduleNameInput.addEventListener('input', ()=>{
    const mod = getCurrentModule();
    if(!mod) return;
    mod.name = moduleNameInput.value;
    saveToStorage();
    renderModuleList();
  });
  
  moduleNotesInput.addEventListener('input', ()=>{
    const mod = getCurrentModule();
    if(!mod) return;
    mod.notes = moduleNotesInput.value;
    saveToStorage();
  });

  /* SEARCH */
  moduleSearch.addEventListener('input', ()=> renderModuleList());
  
  quickSearch.addEventListener('input', ()=>{
    // highlight marks with labels matching quick query
    // This logic logic was partially moved to renderMarks to be consistent,
    // but the input trigger is here.
    renderMarks();
  });

  /* keyboard delete */
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'Delete' || e.key === 'Backspace'){
      // if a mark is focused? not tracking focused marks - skip
    }
  });
}