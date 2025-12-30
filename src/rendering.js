/* rendering.js - Manipulação da UI (VERSÃO CORRETA) */
import { state, getCurrentModule } from './state.js';
import { 
  moduleListEl, moduleSearch, moduleTpl, moduleNameInput, 
  moduleNotesInput, stageImg, marksLayer, markTpl, quickSearch 
} from './dom.js';
import { saveToStorage } from './storage.js';
import { deleteMark, editMarkLabel, startDragMark, openTextMarkMenu } from './marks.js'; 
import { syncSaveButton } from './ui-modal.js';
import { setupTextMarkResize, startDragTextMark } from './marks.js';


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

  // === DIFERENÇA AQUI: marks de texto são retângulos ===
  if (mark.type === 'text') {
    // Remove o dot (não queremos o círculo verde)
    dot.remove();

    // Configura o container como retângulo
    el.classList.add('text-mark-rect');
    el.style.left = `${(mark.x * 100)}%`;
    el.style.top = `${(mark.y * 100)}%`;
    el.style.width = `${(mark.width || 0.2) * 100}%`;
    el.style.height = `${(mark.height || 0.15) * 100}%`;
    el.style.transform = 'none'; // remove o translate(-50%,-50%) padrão

    // Label fica dentro da caixa
    label.textContent = mark.title || (mark.type === 'text' ? 'TEXTO' : mark.label || '');
    label.style.position = 'absolute';
    label.style.top = '4px';
    label.style.left = '8px';
    label.style.background = 'rgba(0,0,0,0.6)';
    label.style.padding = '4px 8px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '14px';
    label.style.pointerEvents = 'none';

    // Botão delete dentro da caixa
    delBtn.style.position = 'absolute';
    delBtn.style.top = '4px';
    delBtn.style.right = '8px';
    delBtn.style.background = 'rgba(255,0,0,0.7)';
    delBtn.style.width = '20px';
    delBtn.style.height = '20px';
    delBtn.style.borderRadius = '50%';
    delBtn.style.fontSize = '12px';

    // Adiciona as 4 alças de redimensionamento
    ['nw', 'ne', 'sw', 'se'].forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      handle.dataset.dir = dir;
      el.appendChild(handle);
    });

  } else {
    // === Marks de ponto (mantém exatamente como estava) ===
    dot.style.transform = `scale(${mark.size || 1})`;
    label.textContent = mark.label || '';
    el.style.left = (mark.x*100) + '%';
    el.style.top = (mark.y*100) + '%';
  }

  el.dataset.markId = mark.id;

  // Eventos comuns
  delBtn.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    deleteMark(mark.id);
  });

  // Drag da mark inteira (apenas para texto: move o retângulo)
  if (mark.type === 'text') {
    el.addEventListener('mousedown', (ev) => {
      if (ev.target.classList.contains('resize-handle')) return; // não drag se clicou na alça
      if (ev.button !== 0) return;
      ev.stopPropagation();
      startDragTextMark(ev, mark, el);
    });
  } else {
    // Drag do ponto antigo
    el.addEventListener('mousedown', (ev)=>{
      if(ev.button !== 0) return;
      ev.stopPropagation();
      startDragMark(ev, mark, el);
    });

    // Zoom com scroll (só para pontos)
    dot.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      mark.size = Math.max(0.3, Math.min(4, (mark.size || 1) + delta));
      dot.style.transform = `scale(${mark.size})`;
      state.dirty = true;
      syncSaveButton();
    }, { passive: false });
  }

  // Click para abrir modal (só texto)
  if (mark.type === 'text') {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('resize-handle') || e.target.classList.contains('mark-delete')) return;
      e.stopPropagation();
      openTextMarkMenu(mark);
    });
  }

  // Filtro de busca
  if(q){
    const matches = (mark.label||'').toLowerCase().includes(q) || 
                    (mark.title||'').toLowerCase().includes(q) || 
                    (mark.description||'').toLowerCase().includes(q); 
    el.style.display = matches ? 'flex' : 'none';
  }

  marksLayer.appendChild(el);
});
}