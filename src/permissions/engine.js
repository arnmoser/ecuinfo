// permissions/engine.js
import { ACTIONS } from './actions.js';
import { DEMO_LIMITS } from './demoLimits.js';

export function canPerform({ action, account, context = {} }) {
  // 🔴 Não autenticado
  if (!account) {
    return deny('not_authenticated');
  }

  // 🟡 DEMO
  if (account.status === 'demo') {
    return handleDemo(action, account);
  }

  // 🟢 ATIVO
  if (account.status === 'active') {
    return handleActive(action, account, context);
  }

  // ⚫ EXPIRADO
  return deny('subscription_expired');
}

function handleDemo(action, account) {
  switch (action) {
    case ACTIONS.CREATE_PROJECT:
      return account.usage.projects < DEMO_LIMITS.projects
        ? allow()
        : paywall('demo_limit');

    case ACTIONS.UPLOAD_FILE:
      return account.usage.uploads < DEMO_LIMITS.uploads
        ? allow()
        : paywall('demo_limit');

    case ACTIONS.COMPARE_FILE:
      return account.usage.comparisons < DEMO_LIMITS.comparisons
        ? allow()
        : paywall('demo_limit');

    default:
      return paywall('demo_restricted');
  }
}

function handleActive(action, account, context) {
  if (action === ACTIONS.USE_ECU_PACK) {
    const packId = context.packId;
    return account.ecuPacks.includes(packId)
      ? allow()
      : paywall('no_pack');
  }

  if (action === ACTIONS.EXPORT_FILE) {
    return allow();
  }

  return allow();
}

function allow() {
  return { allowed: true };
}

function deny(reason) {
  return { allowed: false, reason, paywall: false };
}

function paywall(reason) {
  return { allowed: false, reason, paywall: true };
}
