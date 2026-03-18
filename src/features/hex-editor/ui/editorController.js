import { parseOffset } from '../core/byteFormat.js';
import { clampOffset } from '../core/bufferModel.js';
import { openLocalFile, exportLocalFile } from '../services/fileService.js';
import { computeDiff } from '../services/diffService.js';
import { createEditorState } from '../state/editorState.js';
import { renderHexEditorLayout } from './layout.js';
import { initSafetyNotices } from './safetyNotices.js';
import { VirtualHexView } from './virtualHexView.js';

const LARGE_FILE_THRESHOLD_BYTES = 1024 * 1024;

function formatByteCount(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function isEditableElement(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

export function initHexEditor(root, options) {
  const refs = renderHexEditorLayout(root);
  const store = createEditorState();
  let syncLock = false;
  let pendingNibble = '';
  function clearPendingNibble() {
    pendingNibble = '';
  }
  function focusOffsetInSide(side, offset) {
    if (side === 'right') {
      rightView.focusOffset(offset);
      return;
    }
    leftView.focusOffset(offset);
  }
  function setSelection(side, offset) {
    store.setActiveEditOffset(offset, side);
    focusOffsetInSide(side, offset);
    clearPendingNibble();
  }
  const leftView = new VirtualHexView({
    container: refs.paneLeft,
    side: 'left',
    getState: store.get,
    onByteEdit: (side, offset, value) => {
      store.updateByte(side, offset, value);
      if (store.get().compareMode) {
        runDiff();
      }
    },
    onScroll: (side, scrollTop) => {
      if (!store.get().compareMode || syncLock) return;
      syncLock = true;
      if (side === 'left') rightView.setScrollTop(scrollTop);
      if (side === 'right') leftView.setScrollTop(scrollTop);
      syncLock = false;
    },
    onSelectOffset: (side, offset) => setSelection(side, offset)
  });
  const rightView = new VirtualHexView({
    container: refs.paneRight,
    side: 'right',
    getState: store.get,
    onByteEdit: (side, offset, value) => {
      store.updateByte(side, offset, value);
      if (store.get().compareMode) {
        runDiff();
      }
    },
    onScroll: (side, scrollTop) => {
      if (!store.get().compareMode || syncLock) return;
      syncLock = true;
      if (side === 'left') rightView.setScrollTop(scrollTop);
      if (side === 'right') leftView.setScrollTop(scrollTop);
      syncLock = false;
    },
    onSelectOffset: (side, offset) => setSelection(side, offset)
  });

  function setStatus(text, tone = 'neutral') {
    refs.statusBar.textContent = text;
    refs.statusBar.dataset.tone = tone;
  }

  const safetyNotices = initSafetyNotices({
    shell: refs.shell,
    toolbarRight: refs.toolbarRight,
    allowed: options.allowed,
    setStatus
  });

  function setLoading(active, message = 'Processando arquivo...') {
    refs.loadingOverlay.classList.toggle('hidden', !active);
    refs.loadingText.textContent = message;
  }

  function getStageMessage(stage, fileName) {
    if (stage === 'reading') {
      return `Lendo arquivo: ${fileName}`;
    }
    return `Processando arquivo: ${fileName}`;
  }

  function waitForPaint() {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve());
    });
  }

  function renderState() {
    const state = store.get();
    refs.saveBtn.disabled = state.left.data.length === 0;
    refs.paneRight.classList.toggle('hidden', !state.compareMode);
    refs.closeCompareBtn.classList.toggle('hidden', !state.compareMode);
    const leftName = state.left.fileName || 'Nenhum arquivo carregado';
    const rightName = state.compareMode ? ` | Direita: ${state.right.fileName || 'Nenhum arquivo'}` : '';
    const diffText = state.compareMode ? ` | Bytes diferentes: ${state.diffIndices.size}` : '';
    const loading = state.isDiffRunning ? ' | Processando comparação...' : '';
    setStatus(`Esquerda: ${leftName} (${formatByteCount(state.left.data.length)})${rightName}${diffText}${loading}`);
    leftView.render();
    rightView.render();
  }

  async function loadLeft(file) {
    const isLargeFile = file.size >= LARGE_FILE_THRESHOLD_BYTES;
    try {
      if (isLargeFile) {
        setLoading(true, getStageMessage('reading', file.name));
        setStatus(`Arquivo grande detectado (${formatByteCount(file.size)}). Processando...`, 'neutral');
        await waitForPaint();
      }
      const pane = await openLocalFile(file, {
        onStage: stage => {
          if (!isLargeFile) return;
          setLoading(true, getStageMessage(stage, file.name));
        }
      });
      store.setPane('left', pane);
      store.setCompareMode(false);
      store.setPane('right', { fileName: '', format: 'bin', data: new Uint8Array(0), startAddress: 0 });
      store.resetDiff();
      store.setActiveEditOffset(pane.data.length > 0 ? 0 : null, 'left');
      if (pane.data.length > 0) {
        safetyNotices.onFirstFileLoad();
      }
      setStatus(`Arquivo carregado: ${pane.fileName}`, 'ok');
    } catch (error) {
      setStatus(error.message || 'Falha ao carregar o arquivo.', 'error');
    } finally {
      if (isLargeFile) {
        setLoading(false);
      }
    }
  }

  async function runDiff() {
    const state = store.get();
    if (!state.compareMode) return;
    store.setDiffRunning(true);
    try {
      const diffArray = await computeDiff(state.left.data, state.right.data);
      store.setDiff(diffArray);
    } catch (error) {
      store.setDiff([]);
      setStatus(error.message || 'Falha ao comparar arquivos.', 'error');
    }
  }

  async function loadRight(file) {
    const isLargeFile = file.size >= LARGE_FILE_THRESHOLD_BYTES;
    try {
      if (isLargeFile) {
        setLoading(true, getStageMessage('reading', file.name));
        setStatus(`Arquivo grande de comparação detectado (${formatByteCount(file.size)}). Processando...`, 'neutral');
        await waitForPaint();
      }
      const pane = await openLocalFile(file, {
        onStage: stage => {
          if (!isLargeFile) return;
          setLoading(true, getStageMessage(stage, file.name));
        }
      });
      store.setPane('right', pane);
      store.setCompareMode(true);
      if (pane.data.length > 0) {
        store.setActiveEditOffset(0, 'right');
      }
      await runDiff();
      setStatus(`Arquivo de comparação carregado: ${pane.fileName}`, 'ok');
    } catch (error) {
      setStatus(error.message || 'Falha ao carregar arquivo de comparação.', 'error');
    } finally {
      if (isLargeFile) {
        setLoading(false);
      }
    }
  }

  function jumpToOffset() {
    const state = store.get();
    const parsed = parseOffset(refs.jumpInput.value);
    if (parsed === null) {
      setStatus('Offset inválido.', 'error');
      return;
    }
    const side = state.activeEditSide || 'left';
    const pane = state[side];
    const normalized = clampOffset(parsed - pane.startAddress, pane.data.length);
    setSelection(side, normalized);
    if (state.compareMode) {
      rightView.focusOffset(normalized);
    }
    setStatus(`Offset selecionado: 0x${parsed.toString(16).toUpperCase()}`, 'ok');
  }

  function moveSelection(delta) {
    const state = store.get();
    const side = state.activeEditSide || 'left';
    const length = state[side].data.length;
    if (length <= 0) return;
    const current = state.activeEditOffset ?? 0;
    const next = clampOffset(current + delta, length);
    setSelection(side, next);
  }

  function editSelectedByte(value) {
    const state = store.get();
    const side = state.activeEditSide || 'left';
    const offset = state.activeEditOffset;
    if (offset === null) return;
    store.updateByte(side, offset, value);
    if (store.get().compareMode) {
      runDiff();
    }
  }

  function handleHexDigitInput(hexDigit) {
    const state = store.get();
    if (state.activeEditOffset === null) return;
    const nibble = hexDigit.toUpperCase();
    if (!pendingNibble) {
      pendingNibble = nibble;
      return;
    }
    const value = Number.parseInt(`${pendingNibble}${nibble}`, 16);
    clearPendingNibble();
    if (Number.isNaN(value)) return;
    editSelectedByte(value);
    moveSelection(1);
  }

  function handleKeyboardShortcuts(event) {
    if (!options.allowed) return;
    const lower = event.key.toLowerCase();
    const isCmd = event.ctrlKey || event.metaKey;
    if (isCmd) {
      if (lower === 'o') {
        event.preventDefault();
        refs.openInput.click();
        return;
      }
      if (lower === 's') {
        event.preventDefault();
        if (store.get().left.data.length > 0) {
          safetyNotices.requestSave(() => exportLocalFile(store.get().left));
        }
        return;
      }
      if (lower === 'g') {
        event.preventDefault();
        refs.jumpInput.focus();
        refs.jumpInput.select();
        return;
      }
      if (event.shiftKey && lower === 'c') {
        event.preventDefault();
        refs.compareBtn.click();
      }
      return;
    }
    if (isEditableElement(event.target)) return;
    if (/^[0-9a-f]$/i.test(event.key)) {
      event.preventDefault();
      handleHexDigitInput(event.key);
      return;
    }
    if (event.key === 'Backspace') {
      clearPendingNibble();
      return;
    }
    const bytesPerRow = store.get().bytesPerRow;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(bytesPerRow);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-bytesPerRow);
      return;
    }
    if (event.key === 'PageDown') {
      event.preventDefault();
      moveSelection(bytesPerRow * 16);
      return;
    }
    if (event.key === 'PageUp') {
      event.preventDefault();
      moveSelection(-(bytesPerRow * 16));
    }
  }

  function bind() {
    refs.openBtn.addEventListener('click', () => refs.openInput.click());
    refs.openInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      await loadLeft(file);
      event.target.value = '';
    });
    refs.saveBtn.addEventListener('click', () => {
      safetyNotices.requestSave(() => exportLocalFile(store.get().left));
    });
    refs.compareBtn.addEventListener('click', () => {
      if (store.get().left.data.length === 0) {
        setStatus('Carregue o arquivo da esquerda antes da comparação.', 'error');
        return;
      }
      refs.compareInput.click();
    });
    refs.compareInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      await loadRight(file);
      event.target.value = '';
    });
    refs.closeCompareBtn.addEventListener('click', () => {
      store.setCompareMode(false);
      store.resetDiff();
      setStatus('Comparação encerrada.', 'neutral');
    });
    refs.jumpBtn.addEventListener('click', jumpToOffset);
    refs.jumpInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') jumpToOffset();
    });
    window.addEventListener('keydown', handleKeyboardShortcuts);
  }

  function applyAccess(allowed) {
    refs.accessDenied.classList.toggle('hidden', allowed);
    refs.workspace.classList.toggle('hidden', !allowed);
    refs.openBtn.disabled = !allowed;
    refs.saveBtn.disabled = !allowed;
    refs.compareBtn.disabled = !allowed;
    refs.jumpBtn.disabled = !allowed;
    refs.jumpInput.disabled = !allowed;
    if (!allowed) {
      refs.plansBtn.classList.remove('hidden');
      setStatus('Assinatura ativa obrigatória para usar o Editor Hexadecimal.', 'error');
    }
  }

  bind();
  applyAccess(options.allowed);
  store.subscribe(renderState);
  renderState();
}
