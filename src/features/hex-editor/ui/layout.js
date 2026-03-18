export function renderHexEditorLayout(root) {
  root.innerHTML = `
    <div class="hex-editor-shell">
      <header class="hex-editor-toolbar">
        <div class="toolbar-left">
          <a id="hexBackBtn" href="../../index.html">Voltar ao ECU Info</a>
          <button id="hexOpenBtn" type="button">Abrir Arquivo</button>
          <button id="hexSaveBtn" type="button" disabled>Salvar Arquivo</button>
          <button id="hexCompareBtn" type="button">Comparar Arquivo</button>
          <button id="hexCloseCompareBtn" type="button" class="hidden">Fechar Comparação</button>
          <input id="hexOpenInput" type="file" accept=".bin,.hex,application/octet-stream" hidden />
          <input id="hexCompareInput" type="file" accept=".bin,.hex,application/octet-stream" hidden />
        </div>
        <div class="toolbar-right">
          <label for="hexJumpInput">Ir para offset</label>
          <input id="hexJumpInput" type="text" placeholder="0x00000000" />
          <button id="hexJumpBtn" type="button">Ir</button>
          <a href="remarketing.html#plans" id="hexPlansBtn" class="hidden">Ver Planos</a>
        </div>
      </header>
      <div id="hexStatusBar" class="hex-status-bar"></div>
      <section id="hexAccessDenied" class="hex-access-denied hidden">
        <h2>Recurso Premium</h2>
        <p>Este editor está disponível apenas para assinaturas ativas.</p>
        <a href="remarketing.html#plans" class="hex-upgrade-btn">Fazer Upgrade</a>
      </section>
      <section id="hexWorkspace" class="hex-workspace hidden">
        <div id="hexPaneLeft" class="hex-pane"></div>
        <div id="hexPaneRight" class="hex-pane hidden"></div>
      </section>
      <div id="hexLoadingOverlay" class="hex-loading-overlay hidden" aria-live="polite">
        <div class="hex-loading-card">
          <div class="hex-loading-spinner"></div>
          <p id="hexLoadingText">Processando arquivo...</p>
        </div>
      </div>
    </div>
  `;
  return {
    shell: root.querySelector('.hex-editor-shell'),
    toolbarRight: root.querySelector('.toolbar-right'),
    backBtn: root.querySelector('#hexBackBtn'),
    openBtn: root.querySelector('#hexOpenBtn'),
    saveBtn: root.querySelector('#hexSaveBtn'),
    compareBtn: root.querySelector('#hexCompareBtn'),
    closeCompareBtn: root.querySelector('#hexCloseCompareBtn'),
    openInput: root.querySelector('#hexOpenInput'),
    compareInput: root.querySelector('#hexCompareInput'),
    jumpInput: root.querySelector('#hexJumpInput'),
    jumpBtn: root.querySelector('#hexJumpBtn'),
    plansBtn: root.querySelector('#hexPlansBtn'),
    statusBar: root.querySelector('#hexStatusBar'),
    loadingOverlay: root.querySelector('#hexLoadingOverlay'),
    loadingText: root.querySelector('#hexLoadingText'),
    accessDenied: root.querySelector('#hexAccessDenied'),
    workspace: root.querySelector('#hexWorkspace'),
    paneLeft: root.querySelector('#hexPaneLeft'),
    paneRight: root.querySelector('#hexPaneRight')
  };
}
