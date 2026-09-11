import { canPerform } from '../../permissions/engine.js';
import { ACTIONS } from '../../permissions/actions.js';
import { loadAccount } from '../../services/accountService.js';
import { supabase } from '../../services/supabase.js';
import { initHexEditor } from './ui/editorController.js';

async function bootstrapHexEditor() {
  const root = document.getElementById('hexEditorRoot');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '../../index.html?intent=login';
    return;
  }
  let allowed = false;
  try {
    const account = await loadAccount(session.user.id);
    const permission = canPerform({ action: ACTIONS.EXPORT_FILE, account });
    allowed = permission.allowed && account.status === 'active';
  } catch (error) {
    allowed = false;
  }
  // FAIL-CLOSED: sem direito, nem inicializa o editor (nenhum handler de
  // arquivo, view ou atalho é criado) — só a tela de bloqueio com CTA.
  // Limitação honesta: o processamento é 100% local, então esta barreira é
  // de UX/receita, não um perímetro de segurança (não há dado de servidor
  // em jogo). O gating real de dados continua no RLS + account_access.
  if (!allowed) {
    root.innerHTML = `
      <main class="hex-access-denied" style="max-width:640px;margin:8rem auto;text-align:center;font-family:system-ui,sans-serif;padding:0 1.5rem;">
        <h1>Editor Hexadecimal — plano ativo necessário</h1>
        <p>Sua assinatura precisa estar ativa para usar esta ferramenta.</p>
        <button type="button" data-action="plans" style="padding:.9rem 2rem;font-size:1rem;cursor:pointer;">Ver Planos</button>
      </main>
    `;
    root.querySelector('[data-action="plans"]')?.addEventListener('click', () => {
      window.location.href = './remarketing.html#plans';
    });
    return;
  }
  initHexEditor(root, { allowed: true });
}

bootstrapHexEditor();
