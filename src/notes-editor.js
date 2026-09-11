/* notes-editor.js - Camada APENAS visual do editor de Notas Técnicas.
 *
 * Restrições respeitadas:
 * - #moduleNotes continua sendo um <textarea> que salva texto simples.
 * - Abas, toolbar e indicador de autosave são simulação visual (frontend state).
 * - Nenhuma chamada de API, schema ou fluxo de salvamento foi alterado.
 * - Toda mutação no textarea dispara 'input' para o listener existente
 *   (events.js) continuar sincronizando module.notes normalmente.
 */
import { state } from './state.js';

const TAB_HINTS = {
  spec: 'Ex.: modelo da ECU, MCU, memória, tensão de alimentação…',
  proc: 'Ex.: passo 1, passo 2, medidas encontradas…',
  pin: 'Ex.: pino 12V, GND, sinal…'
};

// Rascunhos por módulo+aba, só em memória (não persistem reload).
const drafts = new Map();
let activeTab = 'spec';
let autosaveTimer = null;

function draftKey() {
  return `${state.currentModuleId ?? 'none'}:${activeTab}`;
}

function getTextarea() {
  return document.getElementById('moduleNotes');
}

function syncInputEvent(textarea) {
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function setAutosave(mode) {
  const ind = document.getElementById('notesAutosave');
  if (!ind) return;
  const label = ind.querySelector('.autosave-text');
  ind.classList.toggle('is-editing', mode === 'editing');
  if (label) label.textContent = mode === 'editing' ? 'Editando…' : 'Salvo automaticamente';
}

function scheduleAutosave() {
  setAutosave('editing');
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => setAutosave('saved'), 1200);
}

function switchTab(tab, btn) {
  const textarea = getTextarea();
  if (!textarea || textarea.readOnly) return;
  if (tab === activeTab) return;

  // Guarda o rascunho visual da aba atual…
  drafts.set(draftKey(), textarea.value);
  activeTab = tab;

  // …e restaura o da aba destino (se existir; senão mantém o texto único).
  const saved = drafts.get(draftKey());
  if (saved !== undefined && saved !== textarea.value) {
    textarea.value = saved;
    syncInputEvent(textarea);
  }

  document.querySelectorAll('.notes-tab').forEach(b =>
    b.classList.toggle('active', b === btn));
  textarea.placeholder = TAB_HINTS[tab] ?? '';
}

function wrapSelection(before, after) {
  const textarea = getTextarea();
  if (!textarea || textarea.readOnly) return;
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e) || 'texto';
  textarea.value = value.slice(0, s) + before + selected + after + value.slice(e);
  textarea.focus();
  textarea.selectionStart = s + before.length;
  textarea.selectionEnd = s + before.length + selected.length;
  syncInputEvent(textarea);
  scheduleAutosave();
}

const TABLE_TEMPLATE = '\n| Pino | Valor |\n| --- | --- |\n|  |  |\n';

export function setupNotesEditor() {
  const textarea = getTextarea();
  if (!textarea) return;

  document.querySelectorAll('.notes-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.notesTab, btn));
  });

  document.querySelectorAll('.notes-toolbar [data-fmt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.fmt;
      if (fmt === 'bold') wrapSelection('**', '**');
      else if (fmt === 'italic') wrapSelection('*', '*');
      else if (fmt === 'table') {
        if (textarea.readOnly) return;
        const { selectionStart: s, value } = textarea;
        textarea.value = value.slice(0, s) + TABLE_TEMPLATE + value.slice(s);
        textarea.focus();
        syncInputEvent(textarea);
        scheduleAutosave();
      }
    });
  });

  // Indicador visual de autosave (não altera o salvamento real).
  textarea.addEventListener('input', scheduleAutosave);

  // Ao trocar de módulo, registra o conteúdo exibido como base do rascunho
  // da aba atual (sem sobrescrever rascunhos existentes de outras abas).
  document.getElementById('moduleList')?.addEventListener('click', () => {
    setTimeout(() => {
      const ta = getTextarea();
      if (!ta) return;
      if (!drafts.has(draftKey())) drafts.set(draftKey(), ta.value);
      setAutosave('saved');
    }, 0);
  });
}
