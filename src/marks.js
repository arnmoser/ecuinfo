/* marks.js - Lógica de Marcas (Adicionar, Editar, Drag) */
import { state, getCurrentModule } from './state.js';
import { getStageContent, stage, marksLayer } from './dom.js';
import { uid } from './utils.js';
import { renderMarks } from './rendering.js';
import { MARK_HOLD_TIME, HOLD_MOVE_TOLERANCE } from './constants.js';
import { modalOverlay, titleInput, descInput, btnSaveMark, btnCancelMark } from './dom.js';
import { syncSaveButton } from './ui-modal.js';
import { btnDeleteMark } from './dom.js';


let markPressTimer = null;
let markPressStart = null;
let currentDrag = null;
let activeMark = null;

export function addMarkAtClientXY(clientX, clientY, type='point'){
  const mod = getCurrentModule();
  const content = getStageContent();
  if(!mod || !stage || !content) return;
  const rect = content.getBoundingClientRect();
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  if(relX < 0 || relX > 1 || relY < 0 || relY > 1) return;

  let newMark;

  if (type === 'text') {
    newMark = {
      id: uid('mk'),
      type: 'text',
      x: parseFloat(relX.toFixed(6)),
      y: parseFloat(relY.toFixed(6)),
      width: 0.20,
      height: 0.15,
      title: '',
      description: '',
      label: 'Clique Para Nomear'
    };
    mod.marks = mod.marks || [];
    mod.marks.push(newMark);
    state.dirty = true;
    syncSaveButton();
    renderMarks();
    openTextMarkMenu(newMark);
    return; // importante: sai da função aqui
  }

  // Caso padrão (point)
  newMark = {
    id: uid('mk'),
    type: 'point',
    x: parseFloat(relX.toFixed(6)),
    y: parseFloat(relY.toFixed(6)),
    label: '',
    title: '',       
    description: '', 
    size: 1 
  };

  mod.marks = mod.marks || [];
  mod.marks.push(newMark);
  state.dirty = true;
  syncSaveButton();
  renderMarks();
}

/* --- FUNÇÃO LIMPA: Apenas lógica de controle --- */
export function openTextMarkMenu(mark) {
    // 1. Preenche os inputs com os dados atuais da mark
    titleInput.value = mark.title || '';
    descInput.value = mark.description || '';
    activeMark = mark;

    // 2. Define o que acontece ao clicar em SALVAR
    // Usamos .onclick para sobrescrever qualquer handler anterior e evitar duplicação
    btnSaveMark.onclick = () => {
        mark.title = titleInput.value;
        mark.description = descInput.value;
        
        mark.label = mark.title || 'TEXT'; 

        state.dirty = true;
        syncSaveButton();
        renderMarks(); // Atualiza a tela (e os tooltips)
        closeModal();
    };

    // 3. Define o que acontece ao clicar em CANCELAR
    btnCancelMark.onclick = () => {
        closeModal();
    };


    btnDeleteMark.onclick = () => {
  const confirmed = confirm(
    'Tem certeza que deseja deletar esta marcação?\nEssa ação não pode ser desfeita.'
  );

  if (!confirmed) return;

  deleteMark(mark.id);
  closeModal();
    };


    // 4. Mostra o modal (remove a classe hidden)
    modalOverlay.classList.remove('hidden');
    
    // 5. Foco no input
    titleInput.focus();
}

export function openPointMarkMenu(mark) {
    titleInput.value = mark.label || '';
    descInput.value = mark.description || '';
    activeMark = mark;

    btnSaveMark.onclick = () => {
        const newTitle = titleInput.value;
        mark.label = newTitle;
        mark.title = newTitle;
        mark.description = descInput.value;

        state.dirty = true;
        syncSaveButton();
        renderMarks();
        closeModal();
    };

    btnCancelMark.onclick = () => {
        closeModal();
    };

    btnDeleteMark.onclick = () => {
        const confirmed = confirm(
            'Tem certeza que deseja deletar esta marcacao?\nEssa acao nao pode ser desfeita.'
        );

        if (!confirmed) return;

        deleteMark(mark.id);
        closeModal();
    };

    modalOverlay.classList.remove('hidden');
    titleInput.focus();
}

function closeModal() {
    modalOverlay.classList.add('hidden');
}

export function deleteMark(markId){
  const mod = getCurrentModule();
  if(!mod) return;
  const idx = mod.marks.findIndex(m=>m.id===markId);
  if(idx>=0){
    mod.marks.splice(idx,1);
    state.dirty = true;
    syncSaveButton();
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
    state.dirty = true;
    syncSaveButton();
    renderMarks();
  });
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') { input.blur(); }
  });
}

/* MARK DRAG */
export function startDragMark(ev, mark, el){
  ev.preventDefault();
  const content = getStageContent();
  if (!content) return;
  const rect = content.getBoundingClientRect();
  const relX = (ev.clientX - rect.left) / rect.width;
  const relY = (ev.clientY - rect.top) / rect.height;
  currentDrag = {
    mark,
    el,
    offsetX: relX - mark.x,
    offsetY: relY - mark.y
  };
  el.classList.add('dragging');
  window.addEventListener('mousemove', onDragMark);
  window.addEventListener('mouseup', endDragMark);
}

function onDragMark(e){
  if(!currentDrag) return;
  const content = getStageContent();
  if (!content) return;
  const rect = content.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top) / rect.height;
  const nextX = relX - currentDrag.offsetX;
  const nextY = relY - currentDrag.offsetY;
  currentDrag.mark.x = Math.max(0, Math.min(1, parseFloat(nextX.toFixed(6))));
  currentDrag.mark.y = Math.max(0, Math.min(1, parseFloat(nextY.toFixed(6))));
  // move element visually
  currentDrag.el.style.left = (currentDrag.mark.x*100) + '%';
  currentDrag.el.style.top = (currentDrag.mark.y*100) + '%';
}

function endDragMark(){
  if(!currentDrag) return;
  currentDrag.el.classList.remove('dragging');
  state.dirty = true;
  syncSaveButton();
  currentDrag = null;
  window.removeEventListener('mousemove', onDragMark);
  window.removeEventListener('mouseup', endDragMark);
}

export function setupMarkCreationEvents() {
  let isHolding = false;

  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Só botão esquerdo
    if (e.target.closest('.mark')) return; // Não cria marca em cima de outra

    const mod = getCurrentModule();
    
    // CORREÇÃO AQUI: Aceitar tanto a foto em Base64 quanto o caminho do Storage
    if (!mod || (!mod.photo && !mod.photo_path)) return; 

    isHolding = true;
    markPressStart = { x: e.clientX, y: e.clientY };

    markPressTimer = setTimeout(() => {
      if (!isHolding) return;

      addMarkAtClientXY(e.clientX, e.clientY, state.tool);

      isHolding = false;
      markPressTimer = null;
    }, MARK_HOLD_TIME);
  });

  stage.addEventListener('mousemove', (e) => {
    if (!isHolding || !markPressStart) return;

    const dx = Math.abs(e.clientX - markPressStart.x);
    const dy = Math.abs(e.clientY - markPressStart.y);

    if (dx > HOLD_MOVE_TOLERANCE || dy > HOLD_MOVE_TOLERANCE) {
      cancelHold();
    }
  });

  stage.addEventListener('mouseup', cancelHold);
  stage.addEventListener('mouseleave', cancelHold);

  function cancelHold() {
    isHolding = false;
    markPressStart = null;

    if (markPressTimer) {
      clearTimeout(markPressTimer);
      markPressTimer = null;
    }
  }
}


let currentResize = null;
let currentDragText = null;

export function startDragTextMark(ev, mark, el) {
  ev.preventDefault();

  const startX = ev.clientX;
  const startY = ev.clientY;
  const startXRel = mark.x;
  const startYRel = mark.y;

  const rect = stage.getBoundingClientRect();

  const onMove = (e) => {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const dx = deltaX / (rect.width * state.scale);
    const dy = deltaY / (rect.height * state.scale);

    let newX = startXRel + dx;
    let newY = startYRel + dy;

    // Limita para não sair da imagem
    newX = Math.max(0, Math.min(1 - mark.width, newX));
    newY = Math.max(0, Math.min(1 - mark.height, newY));

    el.style.left = (newX * 100) + '%';
    el.style.top = (newY * 100) + '%';
    mark.x = parseFloat(newX.toFixed(6));
    mark.y = parseFloat(newY.toFixed(6));
  };

  const onUp = () => {
    state.dirty = true;
    syncSaveButton();
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// Redimensionamento com alças
// Redimensionamento com alças - VERSÃO CORRIGIDA PARA ZOOM
export function setupTextMarkResize() {
  marksLayer.addEventListener('mousedown', (e) => {
    if (!e.target.classList.contains('resize-handle')) return;
    e.stopPropagation();

    const handle = e.target;
    const el = handle.parentElement;
    const mod = getCurrentModule();
    if (!mod) return;
    const mark = mod.marks.find(m => m.id === el.dataset.markId);
    if (!mark || mark.type !== 'text') return;

    const dir = handle.dataset.dir; // nw, ne, sw, se

    const startX = e.clientX;
    const startY = e.clientY;

    // Valores iniciais da mark (em coordenadas relativas 0-1)
    const startXRel = mark.x;
    const startYRel = mark.y;
    const startWidthRel = mark.width;
    const startHeightRel = mark.height;

    // Pega o bounding rect do stage (área visível)
    const rect = stage.getBoundingClientRect();

    const onMove = (e) => {
      // Deslocamento em pixels na tela
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Converte para coordenadas relativas ao conteúdo, considerando o scale atual
      const dx = deltaX / (rect.width * state.scale);
      const dy = deltaY / (rect.height * state.scale);

      let newX = startXRel;
      let newY = startYRel;
      let newW = startWidthRel;
      let newH = startHeightRel;

      if (dir.includes('e')) newW += dx;        // direita
      if (dir.includes('w')) { newW -= dx; newX += dx; } // esquerda
      if (dir.includes('s')) newH += dy;        // baixo
      if (dir.includes('n')) { newH -= dy; newY += dy; } // cima

      // Limites mínimos e máximos (em fração da imagem)
      newW = Math.max(0.03, Math.min(1, newW));
      newH = Math.max(0.03, Math.min(1, newH));
      newX = Math.max(0, Math.min(1 - newW, newX));
      newY = Math.max(0, Math.min(1 - newH, newY));

      // Atualiza o elemento visual
      el.style.left = (newX * 100) + '%';
      el.style.top = (newY * 100) + '%';
      el.style.width = (newW * 100) + '%';
      el.style.height = (newH * 100) + '%';

      // Atualiza os dados da mark
      mark.x = parseFloat(newX.toFixed(6));
      mark.y = parseFloat(newY.toFixed(6));
      mark.width = parseFloat(newW.toFixed(6));
      mark.height = parseFloat(newH.toFixed(6));
    };

    const onUp = () => {
      state.dirty = true;
      syncSaveButton();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}
setupTextMarkResize();
