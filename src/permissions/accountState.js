// permissions/accountState.js
export function normalizeAccount(account) {
  return {
    status: account.status, // demo | active | expired
    demoExpiresAt: account.demo_expires_at,
    ecuPacks: account.ecu_packs ?? [],
    usage: account.usage ?? {}
  };
}
