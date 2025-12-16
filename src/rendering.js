/* rendering.js - Manipulação da UI */
import { state, getCurrentModule } from './state.js';
import { 
  moduleListEl, moduleSearch, moduleTpl, moduleNameInput, 
  moduleNotesInput, stageImg, marksLayer, markTpl, quickSearch 
} from './dom.js';
import { saveToStorage } from './storage.js';
import { deleteMark, editMarkLabel, startDragMark } from './marks.js';

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
      saveToStorage();
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
    dot.style.transform = `scale(${mark.size || 1})`;
    const label = el.querySelector('.label');
    const delBtn = el.querySelector('.mark-delete');

    label.textContent = mark.label || (mark.type === 'point' ? '' : 'text');

    dot.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      mark.size = Math.max(0.3, Math.min(4, (mark.size || 1) + delta));

      dot.style.transform = `scale(${mark.size})`;
      saveToStorage();
    }, { passive: false });

    // position as percentage
    el.style.left = (mark.x*100) + '%';
    el.style.top = (mark.y*100) + '%';
    el.dataset.markId = mark.id;
    el.classList.toggle('text-mark', mark.type === 'text');

    // events
    el.addEventListener('mousedown', (ev)=>{
      if(ev.button !== 0) return;
      ev.stopPropagation();
      startDragMark(ev, mark, el);
    });

    el.addEventListener('dblclick', (ev)=>{
      ev.stopPropagation();
      editMarkLabel(mark, label);
    });

    delBtn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      deleteMark(mark.id);
    });
    
    // Quick Search visibility logic
    if(q){
       const matches = (mark.label||'').toLowerCase().includes(q);
       el.style.display = matches ? 'flex' : 'none';
    }

    marksLayer.appendChild(el);
  });
}