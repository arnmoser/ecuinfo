export function renderDashboard(root, model) {
  root.innerHTML = `
    <main class="dashboard-shell">
      <section class="dashboard-panel">
        <header class="dashboard-header">
          <p class="dashboard-eyebrow">ECU Info</p>
          <h1>Escolha o subsistema</h1>
          <p class="dashboard-subtitle">Acesse rapidamente as ferramentas da plataforma.</p>
          <div class="dashboard-header-actions">
            <p class="dashboard-user" data-user-label></p>
            <button type="button" class="dashboard-manage-btn" data-action="plans">Gerenciar Planos</button>
          </div>
        </header>
        <div class="dashboard-grid">
          <article class="dashboard-card ${model.ecuInfo.allowed ? '' : 'is-disabled'}" data-target="ecu">
            <h2>ECU Info</h2>
            <p>Mapeamento e análise de módulos</p>
            <button type="button" data-action="ecu" ${model.ecuInfo.allowed ? '' : 'aria-disabled="true"'}>${model.ecuInfo.allowed ? 'Acessar' : 'Ver Planos'}</button>
          </article>
          <article class="dashboard-card ${model.hexEditor.allowed ? '' : 'is-disabled'}" data-target="hex">
            <h2>Editor Hexadecimal</h2>
            <p>Edição e comparação de arquivos binários</p>
            <button type="button" data-action="hex" ${model.hexEditor.allowed ? '' : 'aria-disabled="true"'}>${model.hexEditor.allowed ? 'Abrir Editor' : 'Ver Planos'}</button>
          </article>
        </div>
      </section>
    </main>
  `;
  // SEGURANÇA: userLabel (e-mail da sessão) via textContent, nunca interpolado no HTML.
  const userEl = root.querySelector('[data-user-label]');
  if (userEl) userEl.textContent = model.userLabel ?? '';
}
