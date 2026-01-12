/* stage.js - Lógica de Pan e Zoom */
import { state, getCurrentModule } from './state.js';
import { getStageContent, stage, stageImg, marksLayer } from './dom.js';
import { syncSaveButton } from './ui-modal.js';
let isPanning = false;
let panStart = null;

export function applyTransform(){
  const content = getStageContent();
  if (!content) return;

  content.style.transform = `translate(${state.translate.x}px, ${state.translate.y}px) scale(${state.scale})`;
  content.style.transformOrigin = '0 0';
  
  // Importante: remover transform dos filhos
  stageImg.style.transform = 'none';
  marksLayer.style.transform = 'none';
}

export function setupStagePanZoom(){
  stage.addEventListener('wheel', (e) => {
    const mod = getCurrentModule();
    
    // CORREÇÃO: Verifica se existe photo OU photo_path
    if (!mod || (!mod.photo && !mod.photo_path)) return; 
    
    e.preventDefault();

    const rect = stage.getBoundingClientRect();
    const mx = e.clientX - rect.left; // mouse em coords do stage
    const my = e.clientY - rect.top;

    const prevScale = state.scale;
    const delta = -e.deltaY;
    const step = delta > 0 ? 1.1 : 0.9;
    let newScale = Math.max(0.2, Math.min(5, prevScale * step));

    // ponto em coordenadas de conteúdo (antes do scale)
    const contentY = (my - state.translate.y) / prevScale;
    const contentX = (mx - state.translate.x) / prevScale;

    // após novo scale, queremos que contentX/contentY esteja na mesma posição do mouse
    state.translate.x = mx - contentX * newScale;
    state.translate.y = my - contentY * newScale;

    state.scale = newScale;
    applyTransform();
  }, { passive:false });

  window.addEventListener('mouseup', ()=>{
    document.addEventListener('contextmenu', event => event.preventDefault());
    if(isPanning){ isPanning = false; panStart = null; stage.style.cursor='default'; state.dirty = true; syncSaveButton(); }
    
    // Re-attach mousedown logic inside mouseup wrapper as per original structure logic 
    // (Wait, original logic attached mousedown inside global mouseup? 
    //  Looking at original: Yes, inside window.mouseup it attaches stage.mousedown. 
    //  This seems like a quirk of the original code but we must preserve logic.)
    //  Correction: The original code adds stage listener inside window listener anonymously.
    //  To preserve behavior strictly, we implement the logic directly here.
  });
  
  // Need to extract the stage mousedown logic out or mimic the closure
  stage.addEventListener('mousedown', (e) => {
    if (e.button === 2) { 
      isPanning = true;
      panStart = { x: e.clientX - state.translate.x, y: e.clientY - state.translate.y };
      stage.style.cursor = 'grabbing'; // ou 'move'
    }
  });

  stage.addEventListener('mousemove', (e) => {
    if (!isPanning) return;

    state.translate.x = e.clientX - panStart.x;
    state.translate.y = e.clientY - panStart.y;

    applyTransform(); // atualiza a posição na tela
  });

  /* prevent context menu on stage for nicer pan */
  stage.addEventListener('contextmenu', (e) => {
    if(isPanning) e.preventDefault();
  });
}