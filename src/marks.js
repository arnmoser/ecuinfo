/* marks.js - Lógica de Marcas (Adicionar, Editar, Drag) */
import { state, getCurrentModule } from './state.js';
import { stage, marksLayer } from './dom.js';
import { uid } from './utils.js';
import { saveToStorage } from './storage.js';
import { renderMarks } from './rendering.js';
import { MARK_HOLD_TIME } from './constants.js';

let markPressTimer = null;
let markPressStart = null;
let currentDrag = null;

export function addMarkAtClientXY(clientX, clientY, type='point'){
  const mod = getCurrentModule();
  if(!mod || !stage) return;
  const rect = stage.getBoundingClientRect();
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  if(relX < 0 || relX > 1 || relY < 0 || relY > 1) return;
  
  const newMark = {
    id: uid('mk'),
    type: type,
    x: parseFloat(relX.toFixed(6)),
    y: parseFloat(relY.toFixed(6)),
    label: type === 'text' ? 'TEXT' : '',
    size: 1 // escala inicial
  };

  mod.marks = mod.marks || [];
  mod.marks.push(newMark);
  saveToStorage();
  renderMarks();
}

export function deleteMark(markId){
  const mod = getCurrentModule();
  if(!mod) return;
  const idx = mod.marks.findIndex(m=>m.id===markId);
  if(idx>=0){
    mod.marks.splice(idx,1);
    saveToStorage();
    renderMarks();
  }
}

export function editMarkLabel(mark, labelEl){
  const input = document.createElement('input');
  input.type = 'text';
  input.value = mark.label || '';
  input.style.minWidth = '80px';
  labelEl.replaceWith(input);
  input.focus();
  input.select();
  input.addEventListener('blur', ()=>{
    mark.label = input.value;
    saveToStorage();
    renderMarks();
  });
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') { input.blur(); }
  });
}

/* MARK DRAG */
export function startDragMark(ev, mark, el){
  ev.preventDefault();
  currentDrag = { mark, el, startClientX: ev.clientX, startClientY: ev.clientY };
  el.classList.add('dragging');
  window.addEventListener('mousemove', onDragMark);
  window.addEventListener('mouseup', endDragMark);
}

function onDragMark(e){
  if(!currentDrag) return;
  const rect = stage.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top) / rect.height;
  currentDrag.mark.x = Math.max(0, Math.min(1, parseFloat(relX.toFixed(6))));
  currentDrag.mark.y = Math.max(0, Math.min(1, parseFloat(relY.toFixed(6))));
  // move element visually
  currentDrag.el.style.left = (currentDrag.mark.x*100) + '%';
  currentDrag.el.style.top = (currentDrag.mark.y*100) + '%';
}

function endDragMark(){
  if(!currentDrag) return;
  currentDrag.el.classList.remove('dragging');
  saveToStorage();
  currentDrag = null;
  window.removeEventListener('mousemove', onDragMark);
  window.removeEventListener('mouseup', endDragMark);
}

export function setupMarkCreationEvents(){
  /* STAGE CLICK -> add mark */
  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // só botão esquerdo

    const mod = getCurrentModule();
    if (!mod || !mod.photo) return;

    // não criar mark se clicou em mark existente
    if (e.target.closest('.mark')) return;

    markPressStart = { x: e.clientX, y: e.clientY };

    markPressTimer = setTimeout(() => {
      addMarkAtClientXY(e.clientX, e.clientY, state.tool);
      markPressTimer = null;
    }, MARK_HOLD_TIME);
  });

  stage.addEventListener('mouseup', () => {
    if (markPressTimer) {
      clearTimeout(markPressTimer);
      markPressTimer = null;
    }
    markPressStart = null;
  });
}