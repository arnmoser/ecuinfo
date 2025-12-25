/* events.js - Configuração de Event Listeners Globais */

import {
  newModuleBtn,
  deleteModuleBtn,
  toolPointBtn,
  toolTextBtn,
  photoInput,
  exportBtn,
  importInput,
  moduleNameInput,
  moduleNotesInput,
  moduleSearch,
  quickSearch,
  btnSaveProject
} from './dom.js';

import { createModule, deleteCurrentModule } from './modules.js';
import { state, getCurrentModule } from './state.js';
import { fileToDataURL } from './utils.js';
import { saveToStorage } from './storage.js';
import {
  renderCurrentModule,
  renderModuleList,
  renderMarks
} from './rendering.js';
import { syncSaveButton } from './ui-modal.js';
import { saveProjectToSupabase } from './services/supabaseStorage.js';

/* ======================
   SAVE HANDLER
   ====================== */

async function handleSaveProject() {
  if (!state.dirty) return;

  let payload;

  // 1. Salva local (fonte de verdade)
  try {
    payload = saveToStorage();
  } catch (err) {
    console.error('[local] Falha ao salvar', err);
    alert('Erro ao salvar localmente.');
    return;
  }

  // 2. Tenta sincronizar remoto (best-effort)
  try {
    await saveProjectToSupabase(payload);
    console.log('[remote] Projeto sincronizado');
  } catch (err) {
    console.error('[remote] Falha ao sincronizar', err);
    alert(
      'Projeto salvo localmente, mas não foi possível sincronizar com o servidor.'
    );
  }

  // 3. Finaliza ciclo
  state.dirty = false;
  syncSaveButton();
}

/* ======================
   TOOL HANDLER
   ====================== */

function setTool(tool) {
  state.tool = tool;
  toolPointBtn?.classList.toggle('active', tool === 'point');
  toolTextBtn?.classList.toggle('active', tool === 'text');
}

/* ======================
   GLOBAL EVENTS SETUP
   ====================== */

export function setupGlobalEvents() {
  /* -------- SAVE -------- */
  if (btnSaveProject) {
    btnSaveProject.disabled = !state.dirty;
    btnSaveProject.addEventListener('click', handleSaveProject);
  }

  /* -------- MODULES -------- */
  newModuleBtn?.addEventListener('click', createModule);
  deleteModuleBtn?.addEventListener('click', deleteCurrentModule);

  /* -------- TOOLS -------- */
  toolPointBtn?.addEventListener('click', () => setTool('point'));
  toolTextBtn?.addEventListener('click', () => setTool('text'));

  /* -------- IMAGE UPLOAD -------- */
  photoInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const module = getCurrentModule();
    if (!module) {
      alert('Selecione um módulo antes de adicionar uma imagem.');
      photoInput.value = '';
      return;
    }

    module.photo = await fileToDataURL(file);
    state.dirty = true;
    syncSaveButton();
    renderCurrentModule();

    photoInput.value = '';
  });

  /* -------- EXPORT -------- */
  exportBtn?.addEventListener('click', () => {
    const payload = { modules: structuredClone(state.modules) };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mini-ecu-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  /* -------- IMPORT -------- */
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed.modules)) {
        throw new Error('Formato inválido');
      }

      state.modules = parsed.modules;
      state.currentModuleId = state.modules[0]?.id ?? null;
      state.dirty = true;

      syncSaveButton();
      renderModuleList();
      renderCurrentModule();

      alert('Importação concluída.');
    } catch (err) {
      alert('Falha ao importar: ' + err.message);
    } finally {
      importInput.value = '';
    }
  });

  /* -------- QUICK EDITS -------- */
  moduleNameInput?.addEventListener('input', () => {
    const module = getCurrentModule();
    if (!module) return;

    module.name = moduleNameInput.value;
    state.dirty = true;
    syncSaveButton();
    renderModuleList();
  });

  moduleNotesInput?.addEventListener('input', () => {
    const module = getCurrentModule();
    if (!module) return;

    module.notes = moduleNotesInput.value;
    state.dirty = true;
    syncSaveButton();
  });

  /* -------- SEARCH -------- */
  moduleSearch?.addEventListener('input', renderModuleList);
  quickSearch?.addEventListener('input', renderMarks);

  /* -------- UNSAVED WARNING -------- */
  window.addEventListener('beforeunload', (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}
