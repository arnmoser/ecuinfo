/* ui-confirm.js - Diálogo de confirmação escuro, Promise-based.
 * Substitui o confirm() nativo mantendo o visual do app.
 * Seguro: mensagem sempre via textContent.
 */
export function confirmDialog(message, { confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10001;
      background: rgba(0,0,0,.6);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      width: min(380px, 100%); background: #0f1312;
      border: 1px solid #1f2623; border-radius: 16px; padding: 24px;
      box-shadow: 0 24px 50px rgba(0,0,0,.45); color: #e7ecea;
      font-family: Inter, system-ui, sans-serif;
      display: flex; flex-direction: column; gap: 16px;
    `;

    const text = document.createElement('p');
    text.style.cssText = 'margin: 0; font-size: 14px; line-height: 1.5;';
    text.textContent = message;

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.cssText = `
      min-height: 38px; padding: 9px 16px; border-radius: 10px; cursor: pointer;
      background: transparent; color: #cfd6d3; border: 1px solid #2b3330;
    `;

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = confirmLabel;
    okBtn.style.cssText = `
      min-height: 38px; padding: 9px 16px; border-radius: 10px; cursor: pointer;
      border: 0; font-weight: 600; color: #fff;
      background: ${danger ? '#DC2626' : '#2563EB'};
    `;

    const done = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelBtn.addEventListener('click', () => done(false));
    okBtn.addEventListener('click', () => done(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) done(false); });
    window.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { window.removeEventListener('keydown', esc); done(false); }
    });

    actions.append(cancelBtn, okBtn);
    box.append(text, actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}
