/* rendering.js - Manipulação da UI (VERSÃO CORRETA) */
import { state, getCurrentModule } from './state.js';
import { 
  moduleListEl, moduleSearch, moduleTpl, moduleNameInput, 
  moduleNotesInput, stageImg, marksLayer, markTpl, quickSearch 
} from './dom.js';
import { saveToStorage } from './storage.js';
import { editMarkLabel, startDragMark, openTextMarkMenu, openPointMarkMenu } from './marks.js'; 
import { syncSaveButton } from './ui-modal.js';
import { setupTextMarkResize, startDragTextMark } from './marks.js';
import { supabase } from './services/supabase.js';

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

export async function renderCurrentModule() {
  const mod = getCurrentModule();
  
  // 1. Limpeza imediata da camada de marcas (evita fantasmas)
  marksLayer.innerHTML = '';

  if (!mod) {
    moduleNameInput.value = '';
    moduleNotesInput.value = '';
    stageImg.src = '';
    marksLayer.innerHTML = '<div class="no-module">Selecione ou crie um módulo.</div>';
    return;
  }

  moduleNameInput.value = mod.name;
  moduleNotesInput.value = mod.notes;

  // 2. Tratamento para Módulo Novo (Sem Foto)
if (!mod.photo && !mod.photo_path) {
  stageImg.src = ''; 
  
  // Limpa as marcas antigas
  marksLayer.innerHTML = '';
  
  // Remove qualquer aviso antigo para não duplicar
  const oldMsg = stage.querySelector('.no-photo-message');
  if (oldMsg) oldMsg.remove();

  // Injeta o aviso direto no STAGE (o pai fixo)
  const msgHtml = `
    <div class="no-photo-message">
      <div class="no-photo-card">
        <div style="font-size: 50px; margin-bottom: 20px;">🖼️</div>
        <p>Módulo sem imagem de referência</p>
        <span>Para realizar as marcações, use o botão <b>"Adicionar Foto"</b> na barra superior.</span>
      </div>
    </div>
  `;
  stage.insertAdjacentHTML('beforeend', msgHtml);
  return; 
} else {
  // Se houver foto, remove o aviso caso ele esteja lá
  const oldMsg = stage.querySelector('.no-photo-message');
  if (oldMsg) oldMsg.remove();
}

  // 3. Lógica de carregamento de imagem (se houver foto)
  if (mod.photo_path) {
    try {
      const pathClean = String(mod.photo_path).trim().replace(/^\/+/, '');
      const { data, error } = await supabase.storage
        .from('ecu_images')
        .createSignedUrl(pathClean, 3600);
      
      if (error) throw error;
      if (data?.signedUrl) stageImg.src = data.signedUrl;
    } catch (err) {
      stageImg.src = mod.photo || ''; 
    }
  } else {
    stageImg.src = mod.photo || '';
  }

  // 4. Renderização das marcas (Só ocorre se a imagem carregar com sucesso)
  stageImg.onload = () => {
    renderMarks();
  };
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
    label.textContent = mark.title || 'Sem título';
    label.classList.add('text-mark-label');
    label.style.position = 'absolute';
    label.style.top = '4px';
    label.style.left = '8px';
    label.style.background = 'rgba(0,0,0,0.6)';
    label.style.padding = '4px 8px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '14px';
    label.style.pointerEvents = 'none';

   
    // Adiciona as 4 alças de redimensionamento
    ['nw', 'ne', 'sw', 'se'].forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      handle.dataset.dir = dir;
      el.appendChild(handle);
    });

  } else {
    // === Marks de ponto (mantém exatamente como estava) ===
    el.classList.add('point-mark');
    dot.style.transform = 'scale(1)';
    label.textContent = mark.label || '';
    el.style.left = (mark.x*100) + '%';
    el.style.top = (mark.y*100) + '%';
  }

  el.dataset.markId = mark.id;

  

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

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openPointMarkMenu(mark);
    });
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
