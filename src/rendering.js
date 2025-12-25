/* rendering.js - Manipulação da UI (VERSÃO CORRETA) */
import { state, getCurrentModule } from './state.js';
import { 
  moduleListEl, moduleSearch, moduleTpl, moduleNameInput, 
  moduleNotesInput, stageImg, marksLayer, markTpl, quickSearch 
} from './dom.js';
import { saveToStorage } from './storage.js';
import { deleteMark, editMarkLabel, startDragMark, openTextMarkMenu } from './marks.js'; 
import { syncSaveButton } from './ui-modal.js';


export function renderModuleList(){
  const q = moduleSearch.value.trim().toLowerCase();
  moduleListEl.innerHTML = '';
  state.modules.forEach(mod=>{
    // filter by module name or marks labels if search active
    const matchesName = mod.name.toLowerCase().includes(q);
    const matchesMark = mod.marks && mod.marks.some(mk => (mk.label||'').toLowerCase().includes(q));
    if(q && !(matchesName || matchesMark)) return;

    const item = moduleTpl.content.firstElementChild.cloneNode(true);
    item.querySelector('.title').textContent = mod.name || '(sem nome)';
    item.querySelector('.subtitle').textContent = (mod.marks||[]).length + ' marcas';
    item.addEventListener('click', ()=> {
      state.currentModuleId = mod.id;
      state.dirty = true;
      syncSaveButton();
      renderModuleList();
      renderCurrentModule();
    });
    if(mod.id === state.currentModuleId) item.classList.add('active');
    moduleListEl.appendChild(item);
  });
}

export function renderCurrentModule(){
  const mod = getCurrentModule();
  if(!mod){
    moduleNameInput.value = '';
    moduleNotesInput.value = '';
    stageImg.src = '';
    marksLayer.innerHTML = '<div class="no-module">Selecione ou crie um módulo.</div>';
    return;
  }
  moduleNameInput.value = mod.name;
  moduleNotesInput.value = mod.notes;
  if(mod.photo){
    stageImg.src = mod.photo;
  } else {
    stageImg.src = '';
    stageImg.removeAttribute('src');
  }
  renderMarks();
  renderModuleList();
}


export function renderMarks(){
    
  const mod = getCurrentModule();
  marksLayer.innerHTML = '';
  if(!mod) return;
  
  // Highlight filter logic from quickSearch
  const q = quickSearch.value.trim().toLowerCase();

  (mod.marks||[]).forEach(mark=>{
    const el = markTpl.content.firstElementChild.cloneNode(true);
    const dot = el.querySelector('.dot');
    const label = el.querySelector('.label');
    const delBtn = el.querySelector('.mark-delete');

    dot.style.transform = `scale(${mark.size || 1})`;
    // Atualiza o label: se for texto, mostra o título ou 'TEXT'
    label.textContent = mark.label || (mark.type === 'text' ? (mark.title || 'TEXT') : '');

    // position as percentage
    el.style.left = (mark.x*100) + '%';
    el.style.top = (mark.y*100) + '%';
    el.dataset.markId = mark.id;
    el.classList.toggle('text-mark', mark.type === 'text');

    // =======================================================
    // NOVO COMPORTAMENTO PARA MARCAS DE TEXTO (HOVER E CLICK)
    // =======================================================
    if (mark.type === 'text') {
        // 1. Hover (Tooltip nativo): Exibe o título
        el.title = mark.title || "Marca de Texto"; 

        // 2. Click para editar: Abre o menu de Título/Descrição
        el.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede criar outro ponto
            openTextMarkMenu(mark); // Chama a função importada
        });
        
        // Impede que o dblclick abra o editor de label padrão em marcas de texto
    } else {
        el.addEventListener('dblclick', (ev)=>{
            ev.stopPropagation();
            editMarkLabel(mark, label);
        });
    }
    // =======================================================
    
    // events (Mantenha os eventos de drag e zoom/delete)
    dot.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      mark.size = Math.max(0.3, Math.min(4, (mark.size || 1) + delta));

      dot.style.transform = `scale(${mark.size})`;
      state.dirty = true;
      syncSaveButton();
    }, { passive: false });

    el.addEventListener('mousedown', (ev)=>{
      if(ev.button !== 0) return;
      ev.stopPropagation();
      startDragMark(ev, mark, el);
    });
    
    delBtn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      deleteMark(mark.id);
    });
    
    // Quick Search visibility logic (CORRIGIDA PARA INCLUIR TITLE/DESCRIPTION)
    if(q){
       const matches = (mark.label||'').toLowerCase().includes(q) || 
                       (mark.title||'').toLowerCase().includes(q) || 
                       (mark.description||'').toLowerCase().includes(q); 
       el.style.display = matches ? 'flex' : 'none';
    }

    marksLayer.appendChild(el);
  });
}