import { supabase } from './supabase.js';
import { showToast } from '../ui-toast.js';

const PRICE_IDS = {
  monthly: 'price_1T4OH53SsQLqnAO2yb5vnOQH',
  annual: 'price_1T4Oaa3SsQLqnAO2aAaN0eR5'
};

let pendingCheckout = null;

async function hasActiveSubscription() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return false;

  const { data: accessData } = await supabase
    .from('account_access')
    .select('has_access')
    .eq('owner_user_id', session.user.id)
    .single();

  return accessData?.has_access === true;
}

export async function openCustomerPortal() {
  // TODO: Adicionar estado de "loading" no botão
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    showToast('Você precisa estar logado para gerenciar sua assinatura.', { type: 'error' });
    return;
  }

  const res = await fetch('https://tyxjiyttkkpicmxzwjhr.supabase.co/functions/v1/create-portal-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    showToast('Erro ao abrir o portal de assinaturas. Tente novamente.', { type: 'error' });
    return;
  }

  const { url } = await res.json();
  window.location.href = url;
}

async function createCheckoutSession(priceId, type = 'subscription') {
  // TODO: Adicionar estado de "loading" no botão

  const { data: { session } } = await supabase.auth.getSession();

  // 1. Se já tem assinatura ativa → vai direto para o Customer Portal
  if (session && await hasActiveSubscription()) {
    await openCustomerPortal();
    return;
  }

  // 2. Não logado → salva intento e vai para login
  if (!session) {
    sessionStorage.setItem('pendingCheckout', JSON.stringify({ priceId, type }));
    window.location.href = `/index.html?from=checkout&price=${priceId}`;
    return;
  }

  // 3. Logado mas sem assinatura → checkout normal
  await performCheckout(priceId, type, session);
}

async function performCheckout(priceId, type, session) {
  const res = await fetch('https://tyxjiyttkkpicmxzwjhr.supabase.co/functions/v1/create-checkout-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ price_id: priceId, type })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Erro de comunicação com o servidor.' }));
    console.error('Erro ao iniciar pagamento:', errorData);
    showToast(errorData.message || 'Não foi possível iniciar o pagamento. Tente novamente.', { type: 'error' });
    // TODO: Remover estado de "loading" do botão
    return;
  }

  const { url } = await res.json();
  window.location.href = url;
}

export function setupPricingButtons() {
  document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const plan = btn.dataset.plan;
      const priceId = PRICE_IDS[plan];
      if (priceId) {
        await createCheckoutSession(priceId);
      }
    });
  });
}

// Listener global para checkout pendente após login
supabase.auth.onAuthStateChange(async (event, session) => {
  const pendingRaw = sessionStorage.getItem('pendingCheckout');
  if (event === 'SIGNED_IN' && pendingRaw && session) {
    const pending = JSON.parse(pendingRaw);
    sessionStorage.removeItem('pendingCheckout');
    await performCheckout(pending.priceId, pending.type, session);
  }
});

// Inicializa contexto de checkout na carga da página
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  const pendingRaw = sessionStorage.getItem('pendingCheckout');

  if (params.get('from') === 'checkout' && !pendingRaw) {
    const priceId = params.get('price');
    const type = params.get('type') || 'subscription';
    if (priceId) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ priceId, type }));
    }
  }
});