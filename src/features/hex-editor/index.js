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
  initHexEditor(root, { allowed });
}

bootstrapHexEditor();
