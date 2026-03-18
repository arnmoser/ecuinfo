const DISMISS_KEY = 'ecuinfo_hex_safety_dismissed_v1';
const SAVE_CONFIRM_KEY = 'ecuinfo_hex_safety_save_confirmed_v1';

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch (error) {
    return false;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch (error) {
    return;
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function initSafetyNotices({ shell, toolbarRight, allowed, setStatus }) {
  const dismissed = readFlag(DISMISS_KEY);
  let hasSeenFirstLoad = false;

  const indicatorBtn = createElement('button', 'hex-safety-indicator', '🛡');
  indicatorBtn.type = 'button';
  indicatorBtn.title = 'Abrir avisos de segurança';
  indicatorBtn.setAttribute('aria-label', 'Abrir avisos de segurança');
  toolbarRight.append(indicatorBtn);

  const panel = createElement('aside', 'hex-safety-panel hidden');
  const panelHeader = createElement('div', 'hex-safety-header');
  const panelBadge = createElement('span', 'hex-safety-badge', 'ATENÇÃO');
  const panelTitle = createElement('h3', '', 'Avisos de Segurança');
  const closePanelBtn = createElement('button', 'hex-safety-close', 'Fechar');
  closePanelBtn.type = 'button';
  panelHeader.append(panelBadge, panelTitle, closePanelBtn);
  const list = createElement('ul', 'hex-safety-list');
  const notices = [
    'Sempre faça backup do arquivo original antes de editar',
    'Um único byte errado pode corromper todo o arquivo',
    'Verifique o offset antes de modificar qualquer valor',
    'Teste o arquivo modificado antes de usar em produção'
  ];
  for (const notice of notices) {
    const item = createElement('li', 'hex-safety-item');
    const icon = createElement('span', 'hex-safety-icon', '⚠');
    const text = createElement('span', 'hex-safety-text', notice);
    item.append(icon, text);
    list.append(item);
  }
  const footer = createElement('div', 'hex-safety-footer');
  const dismissBtn = createElement('button', 'hex-safety-dismiss', 'Entendi, não mostrar automaticamente');
  dismissBtn.type = 'button';
  footer.append(dismissBtn);
  panel.append(panelHeader, list, footer);
  shell.append(panel);

  const modal = createElement('div', 'hex-safety-modal hidden');
  modal.innerHTML = `
    <div class="hex-safety-modal-card">
      <h3>Confirme antes de salvar</h3>
      <p>Confirme que você fez backup. Alterações de bytes podem corromper o arquivo.</p>
      <div class="hex-safety-modal-actions">
        <button type="button" id="hexSafetyCancelSave">Cancelar</button>
        <button type="button" id="hexSafetyConfirmSave">Salvar com backup</button>
      </div>
    </div>
  `;
  shell.append(modal);
  const cancelSaveBtn = modal.querySelector('#hexSafetyCancelSave');
  const confirmSaveBtn = modal.querySelector('#hexSafetyConfirmSave');
  let pendingSaveAction = null;

  function showPanel() {
    panel.classList.remove('hidden');
  }

  function hidePanel() {
    panel.classList.add('hidden');
  }

  function showModal() {
    modal.classList.remove('hidden');
  }

  function hideModal() {
    modal.classList.add('hidden');
  }

  function runPendingSave() {
    if (!pendingSaveAction) return;
    const action = pendingSaveAction;
    pendingSaveAction = null;
    action();
  }

  indicatorBtn.addEventListener('click', () => {
    if (panel.classList.contains('hidden')) {
      showPanel();
      return;
    }
    hidePanel();
  });

  closePanelBtn.addEventListener('click', hidePanel);
  dismissBtn.addEventListener('click', () => {
    writeFlag(DISMISS_KEY, true);
    hidePanel();
    setStatus('Avisos de segurança salvos. Use o escudo para reabrir.', 'neutral');
  });

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      hideModal();
      pendingSaveAction = null;
    }
  });

  cancelSaveBtn.addEventListener('click', () => {
    hideModal();
    pendingSaveAction = null;
    setStatus('Salvamento cancelado.', 'neutral');
  });

  confirmSaveBtn.addEventListener('click', () => {
    writeFlag(SAVE_CONFIRM_KEY, true);
    hideModal();
    runPendingSave();
    setStatus('Arquivo salvo com confirmação de segurança.', 'ok');
  });

  indicatorBtn.disabled = !allowed;
  if (!allowed) {
    hidePanel();
  } else if (!dismissed) {
    showPanel();
  }

  return {
    onFirstFileLoad() {
      if (!allowed || hasSeenFirstLoad) return;
      hasSeenFirstLoad = true;
      if (!readFlag(DISMISS_KEY)) {
        showPanel();
      }
    },
    requestSave(action) {
      if (!allowed) return;
      if (readFlag(SAVE_CONFIRM_KEY)) {
        action();
        return;
      }
      pendingSaveAction = action;
      showModal();
    }
  };
}
