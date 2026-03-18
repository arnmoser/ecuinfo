import { getSession, supabase } from './authClient';

const PRICE_IDS = {
  monthly: 'price_1T4OH53SsQLqnAO2yb5vnOQH',
  annual: 'price_1T4Oaa3SsQLqnAO2aAaN0eR5'
} as const;

type PlanKey = keyof typeof PRICE_IDS;

const SUPABASE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_BASE ?? 'https://tyxjiyttkkpicmxzwjhr.supabase.co/functions/v1';
const PENDING_CHECKOUT_KEY = 'ecuinfo_pending_checkout';

async function hasActiveSubscription(userId: string) {
  const { data } = await supabase.from('account_access').select('has_access').eq('owner_user_id', userId).single();
  return data?.has_access === true;
}

async function createPortalSession(accessToken: string) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/create-portal-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Unable to open billing portal. Please try again.');
  }

  const { url } = (await response.json()) as { url: string };
  window.location.href = url;
}

async function createCheckoutSession(priceId: string, accessToken: string) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/create-checkout-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ price_id: priceId, type: 'subscription' })
  });

  if (!response.ok) {
    throw new Error('Unable to start checkout. Please try again.');
  }

  const { url } = (await response.json()) as { url: string };
  window.location.href = url;
}

export function stashPendingPlan(plan: PlanKey) {
  sessionStorage.setItem(PENDING_CHECKOUT_KEY, plan);
}

export async function runPendingCheckoutIfAny() {
  const pendingPlan = sessionStorage.getItem(PENDING_CHECKOUT_KEY) as PlanKey | null;
  if (!pendingPlan) return false;

  const session = await getSession();
  if (!session?.user?.id) return false;

  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  const priceId = PRICE_IDS[pendingPlan];
  await createCheckoutSession(priceId, session.access_token);
  return true;
}

export async function startPlanCheckout(plan: PlanKey) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { needsLogin: true as const };
  }

  const subscribed = await hasActiveSubscription(session.user.id);
  if (subscribed) {
    await createPortalSession(session.access_token);
    return { needsLogin: false as const };
  }

  await createCheckoutSession(PRICE_IDS[plan], session.access_token);
  return { needsLogin: false as const };
}

export async function openPortalForCurrentUser() {
  const session = await getSession();
  if (!session?.access_token) {
    throw new Error('You need to sign in first.');
  }
  await createPortalSession(session.access_token);
}
