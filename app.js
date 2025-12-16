/* Mini ECU Mapper - app.js
   Puro JS, sem libs. LocalStorage para persistência.
*/

const STORAGE_KEY = 'mini_ecu_data_v1';
const LAST_MODULE_KEY = 'mini_ecu_last_v1';
let markPressTimer = null;
let markPressStart = null;
const MARK_HOLD_TIME = 1000; // 1 segundo
const MOVE_TOLERANCE = 5;    // px
const dot = document.querySelector('.mark .dot');
let isResizing = false;
let startY = 0;
let startScale = 1;
let scale = 1;


let state = {
  modules: [],
  currentModuleId: null,
  tool: 'point', // 'point' or 'text'
  scale: 1,
  translate: { x: 0, y: 0 },
  draggingImage: false,
  dragStart: null
};

/* DOM */
const moduleListEl = document.getElementById('moduleList');
const newModuleBtn = document.getElementById('newModuleBtn');
const moduleNameInput = document.getElementById('moduleName');
const moduleNotesInput = document.getElementById('moduleNotes');
const photoInput = document.getElementById('photoInput');
const stage = document.getElementById('stage');
const stageImg = document.getElementById('stageImg');
const marksLayer = document.getElementById('marksLayer');
const toolPointBtn = document.getElementById('toolPoint');
const toolTextBtn = document.getElementById('toolText');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const moduleSearch = document.getElementById('moduleSearch');
const quickSearch = document.getElementById('quickSearch');
const deleteModuleBtn = document.getElementById('deleteModuleBtn');

const moduleTpl = document.getElementById('moduleItemTpl');
const markTpl = document.getElementById('markTpl');

function uid(prefix='id'){return prefix + '_' + Math.random().toString(36).slice(2,9)}

function loadFromStorage(){
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

function saveToStorage(){
  const payload = { modules: state.modules };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if(state.currentModuleId) localStorage.setItem(LAST_MODULE_KEY, state.currentModuleId);
  } catch(e){
    console.error('Erro ao salvar', e);
  }
}

/* MODULE MANAGEMENT */
function createModule(){
  const m = {
    id: uid('mod'),
    name: 'Novo Módulo',
    notes: '',
    photo: '', // base64 or empty
    marks: [] // mark objects
  };
  state.modules.unshift(m);
  state.currentModuleId = m.id;
  saveToStorage();
  renderModuleList();
  renderCurrentModule();
}

function deleteCurrentModule(){
  if(!state.currentModuleId) return;
  const idx = state.modules.findIndex(m=>m.id===state.currentModuleId);
  if(idx>=0){
    if(!confirm('Deletar módulo selecionado?')) return;
    state.modules.splice(idx,1);
    state.currentModuleId = state.modules[0] ? state.modules[0].id : null;
    saveToStorage();
    renderModuleList();
    renderCurrentModule();
  }
}

/* RENDERING */
function renderModuleList(){
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

function getCurrentModule(){
  return state.modules.find(m=>m.id===state.currentModuleId) || null;
}

function renderCurrentModule(){
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

/* MARKS */
function renderMarks(){
  const mod = getCurrentModule();
  marksLayer.innerHTML = '';
  if(!mod) return;
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

    marksLayer.appendChild(el);
  });
 

}

function addMarkAtClientXY(clientX, clientY, type='point'){
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

function deleteMark(markId){
  const mod = getCurrentModule();
  if(!mod) return;
  const idx = mod.marks.findIndex(m=>m.id===markId);
  if(idx>=0){
    mod.marks.splice(idx,1);
    saveToStorage();
    renderMarks();
  }
}

function editMarkLabel(mark, labelEl){
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
let currentDrag = null;
function startDragMark(ev, mark, el){
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

function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* TOOL HANDLERS */
toolPointBtn.addEventListener('click', ()=> setTool('point'));
toolTextBtn.addEventListener('click', ()=> setTool('text'));
function setTool(t){
  state.tool = t;
  toolPointBtn.classList.toggle('active', t==='point');
  toolTextBtn.classList.toggle('active', t==='text');
}

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


/* PAN & ZOOM */
let isPanning = false;
let panStart = null;

stage.addEventListener('wheel', (e) => {
  if(!getCurrentModule() || !getCurrentModule().photo) return;
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
  if(isPanning){ isPanning = false; panStart = null; stage.style.cursor='default'; saveToStorage(); }
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
});


/* apply CSS transform to stage children (img & marksLayer) */
function applyTransform(){
  const content = document.getElementById('stageContent');
  if (!content) return;

  content.style.transform = `translate(${state.translate.x}px, ${state.translate.y}px) scale(${state.scale})`;
  content.style.transformOrigin = '0 0';
  
  // Importante: remover transform dos filhos
  stageImg.style.transform = 'none';
  marksLayer.style.transform = 'none';
}

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
  const q = quickSearch.value.trim().toLowerCase();
  // highlight marks that match within current module and also filter module list to those with marks?
  renderMarks();
  if(!q) return;
  const mod = getCurrentModule();
  if(!mod) return;
  mod.marks.forEach(mk=>{
    const el = marksLayer.querySelector(`[data-mark-id="${mk.id}"]`);
    if(!el) return;
    const matches = (mk.label||'').toLowerCase().includes(q);
    el.style.display = matches ? 'flex' : 'none';
  });
});

/* DELETE MODULE */
deleteModuleBtn.addEventListener('click', deleteCurrentModule);

/* keyboard delete */
window.addEventListener('keydown', (e)=>{
  if(e.key === 'Delete' || e.key === 'Backspace'){
    // if a mark is focused? not tracking focused marks - skip
  }
});

/* INIT */
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
  renderModuleList();
  renderCurrentModule();
  setTool('point');
  applyTransform();
}

newModuleBtn.addEventListener('click', createModule);

/* prevent context menu on stage for nicer pan */
stage.addEventListener('contextmenu', (e) => {
  if(isPanning) e.preventDefault();
});

init();
