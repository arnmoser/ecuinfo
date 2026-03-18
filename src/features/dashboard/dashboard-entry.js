import { canPerform } from '../../permissions/engine.js';
import { ACTIONS } from '../../permissions/actions.js';
import { loadAccount } from '../../services/accountService.js';
import { supabase } from '../../services/supabase.js';
import { renderDashboard } from './dashboard-ui.js';

async function loadAccess(userId) {
  const account = await loadAccount(userId);
  const { data: accessData } = await supabase
    .from('account_access')
    .select('has_access')
    .eq('owner_user_id', userId)
    .maybeSingle();

  const hasGeneralAccess = accessData?.has_access === true;
  const hexPermission = canPerform({ action: ACTIONS.EXPORT_FILE, account });
  const canUseHexEditor = hexPermission.allowed && account.status === 'active';

  return {
    account,
    ecuInfoAllowed: hasGeneralAccess,
    hexEditorAllowed: canUseHexEditor
  };
}

function bindNavigation(root, permissions) {
  const openPricing = () => {
    window.location.href = './remarketing.html#plans';
  };

  const goEcuInfo = () => {
    if (!permissions.ecuInfoAllowed) {
      openPricing();
      return;
    }
    window.location.href = '../../index.html?entry=ecu';
  };

  const goHexEditor = () => {
    if (!permissions.hexEditorAllowed) {
      openPricing();
      return;
    }
    window.location.href = './hex-editor.html';
  };

  root.querySelector('[data-action="ecu"]')?.addEventListener('click', goEcuInfo);
  root.querySelector('[data-action="hex"]')?.addEventListener('click', goHexEditor);
  root.querySelector('[data-action="plans"]')?.addEventListener('click', openPricing);
  root.querySelector('[data-target="ecu"]')?.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    goEcuInfo();
  });
  root.querySelector('[data-target="hex"]')?.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    goHexEditor();
  });
}

async function bootstrapDashboard() {
  const root = document.getElementById('dashboardRoot');
  if (!root) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = '../../index.html?intent=login';
    return;
  }

  try {
    const access = await loadAccess(session.user.id);
    renderDashboard(root, {
      userLabel: session.user.email || 'Usuário',
      ecuInfo: { allowed: access.ecuInfoAllowed },
      hexEditor: { allowed: access.hexEditorAllowed }
    });
    bindNavigation(root, access);
  } catch (error) {
    window.location.href = './remarketing.html#plans';
  }
}

bootstrapDashboard();
