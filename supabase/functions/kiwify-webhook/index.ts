// supabase/functions/kiwify-webhook/index.ts
// Webhook Kiwify -> Supabase (ECU Info)
// Endpoint final: POST https://<projeto>.supabase.co/functions/v1/kiwify-webhook
//
// Payload real Kiwify (infoprodutos), conforme captura real + docs oficiais:
// {
//   "order": {
//     "order_id": "uuid",
//     "order_status": "paid",
//     "webhook_event_type": "order_approved",
//     "Product": { "product_id": "...", "product_name": "..." },
//     "Customer": { "email": "...", "full_name": "..." },
//     "approved_date": "2026-04-22 03:05",
//     "created_at": "2026-04-22 03:05"
//   }
// }
// Triggers configuráveis na Kiwify: compra_aprovada, compra_reembolsada, chargeback, etc.
// O painel da Kiwify gera um `token` por webhook (ex: rxue90njjv1).
// Esse token deve ser enviado como ?token= na URL do webhook.
// Esta função aceita o token em (ordem): query ?token=, header x-kiwify-token, body.token / body.order.token.
// O segredo esperado fica em KIWIFY_WEBHOOK_TOKEN (Supabase Secret). Nunca commitar.
//
// Segurança:
// - compara token com timing-safe compare
// - usa service_role SOMENTE no servidor (Deno.env)
// - idempotente via kiwify_purchases.order_id UNIQUE + upsert
// - nunca confia em e-mail sem normalizar (trim + lower)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXPECTED_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") ?? "";
const ALLOWED_PRODUCT_ID = Deno.env.get("KIWIFY_PRODUCT_ID") ?? ""; // opcional: restringe a 1 produto

// ---------------------------------------------------------------- parsing

export type NormalizedOrder = {
  event: "approved" | "refunded" | "chargeback" | "ignored";
  rawEvent: string;
  email: string;
  orderId: string;
  productId: string;
  purchasedAt: string | null;
};

function s(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseDate(v: unknown): string | null {
  const raw = s(v).trim();
  if (!raw) return null;
  // Kiwify usa "2026-04-22 03:05" (sem timezone). Interpreta como UTC se não houver offset.
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const iso = hasTz ? raw : raw.replace(" ", "T") + ":00Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Mapeia QUALQUER variação de evento Kiwify para approved/refunded/chargeback/ignored. */
export function mapEvent(input: unknown): NormalizedOrder["event"] {
  const e = s(input).trim().toLowerCase();
  if (!e) return "ignored";
  if (
    e === "compra_aprovada" || e === "order_approved" || e === "approved" ||
    e === "paid" || e === "order_paid" || e === "purchase_approved"
  ) return "approved";
  if (
    e === "compra_reembolsada" || e === "order_refunded" || e === "refunded" ||
    e === "refund" || e === "reembolso"
  ) return "refunded";
  if (e === "chargeback" || e === "order_chargeback" || e === "contestacao") return "chargeback";
  // Eventos que devem ser ignorados sem erro (pix_gerado, boleto_gerado, carrinho_abandonado, compra_recusada, subscription_*)
  return "ignored";
}

/**
 * Extrai dados do payload real Kiwify.
 * Suporta: {order:{...}} (formato real), {data:{order:{...}}}, {Order:{...}}, flat {Customer:{...}}.
 */
export function extractOrder(body: any): NormalizedOrder | { error: string } {
  const root = body ?? {};
  const order = root.order ?? root.data?.order ?? root.Order ?? root.data ?? root;

  const customer = order.Customer ?? order.customer ?? root.Customer ?? root.customer ?? {};
  const product = order.Product ?? order.product ?? root.Product ?? root.product ?? {};
  const commissions = order.Commissions ?? order.commissions ?? {};

  const email = normalizeEmail(s(customer.email ?? order.email ?? root.email));
  const orderId = s(order.order_id ?? order.orderId ?? order.id ?? root.order_id).trim();
  const productId = s(product.product_id ?? product.productId ?? order.product_id ?? root.product_id).trim();

  const rawEvent = s(
    order.webhook_event_type ?? order.event ?? order.order_status ??
    root.webhook_event_type ?? root.event ?? root.type ?? root.trigger ?? ""
  );
  const event = mapEvent(rawEvent === "paid" && order.order_status ? "paid" : rawEvent);

  // Caso especial: order_status=paid sem webhook_event_type ainda é aprovação
  const statusPaid = s(order.order_status).toLowerCase() === "paid";
  const finalEvent = event === "ignored" && statusPaid ? "approved" as const : event;

  if (!email || !email.includes("@")) return { error: "missing_customer_email" };
  if (!orderId) return { error: "missing_order_id" };

  const purchasedAt =
    parseDate(order.approved_date ?? order.created_at ?? commissions.approved_date ?? root.created_at) ??
    new Date().toISOString();

  return { event: finalEvent, rawEvent, email, orderId, productId, purchasedAt };
}

/** Comparação timing-safe para o token. */
export function tokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getProvidedToken(req: Request, body: any, url: URL): string {
  const q = url.searchParams.get("token") ?? "";
  if (q) return q;
  const h = req.headers.get("x-kiwify-token") ?? req.headers.get("x-webhook-token") ?? "";
  if (h) return h;
  const b = s(body?.token ?? body?.order?.token ?? body?.data?.token);
  return b;
}

// ---------------------------------------------------------------- handler

serve(async (req: Request) => {
  const url = new URL(req.url);

  // Diagnóstico opcional: GET ?ping=1 retorna 200 sem exigir token (útil p/ testar deploy)
  if (req.method === "GET") {
    if (url.searchParams.get("ping") === "1") {
      return Response.json({ ok: true, service: "kiwify-webhook", time: new Date().toISOString() });
    }
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !EXPECTED_TOKEN) {
    console.error("[kiwify-webhook] missing env (SUPABASE_URL/SERVICE_ROLE_KEY/KIWIFY_WEBHOOK_TOKEN)");
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const provided = getProvidedToken(req, body, url);
  if (!tokensMatch(provided, EXPECTED_TOKEN)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = extractOrder(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 422 });
  }

  // Filtro opcional por produto (se KIWIFY_PRODUCT_ID configurado)
  if (ALLOWED_PRODUCT_ID && parsed.productId && parsed.productId !== ALLOWED_PRODUCT_ID) {
    return Response.json({ ok: true, ignored: "product_mismatch" }, { status: 200 });
  }

  if (parsed.event === "ignored") {
    return Response.json({ ok: true, ignored: parsed.rawEvent || "unknown_event" }, { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    if (parsed.event === "approved") {
      // 1) upsert idempotente da compra
      const { error: upErr } = await supabase.from("kiwify_purchases").upsert(
        {
          order_id: parsed.orderId,
          product_id: parsed.productId || null,
          email: parsed.email,
          status: "active",
          purchased_at: parsed.purchasedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );
      if (upErr) {
        console.error("[kiwify-webhook] upsert purchase failed", upErr);
        return Response.json({ error: "purchase_upsert_failed" }, { status: 500 });
      }

      // 2) se conta já existe (match case-insensitive), ativa
      const { data: existing, error: findErr } = await supabase
        .from("accounts")
        .select("id, owner_user_id, status, stripe_subscription_id, access_source")
        .ilike("email", parsed.email)
        .maybeSingle();
      if (findErr) {
        console.error("[kiwify-webhook] find account failed", findErr);
        return Response.json({ error: "account_lookup_failed" }, { status: 500 });
      }

      if (existing) {
        const { error: updErr } = await supabase.from("accounts").update({
          status: "active",
          access_source: "kiwify",
          kiwify_order_id: parsed.orderId,
          kiwify_product_id: parsed.productId || null,
          kiwify_purchased_at: parsed.purchasedAt,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        if (updErr) {
          console.error("[kiwify-webhook] activate account failed", updErr);
          return Response.json({ error: "account_activate_failed" }, { status: 500 });
        }
        return Response.json({ ok: true, action: "purchase_registered_account_activated" }, { status: 200 });
      }

      // Conta ainda não existe (Caso B): ficará registrada; trigger de criação ativa depois.
      return Response.json({ ok: true, action: "purchase_registered_pending_signup" }, { status: 200 });
    }

    // refunded / chargeback
    const newStatus = parsed.event === "refunded" ? "refunded" : "chargeback";
    const { data: purchase, error: pErr } = await supabase
      .from("kiwify_purchases")
      .select("id, email")
      .eq("order_id", parsed.orderId)
      .maybeSingle();
    if (pErr) {
      console.error("[kiwify-webhook] purchase lookup failed", pErr);
      return Response.json({ error: "purchase_lookup_failed" }, { status: 500 });
    }

    // Idempotência: se pedido nunca existiu, registra já como refunded/chargeback (evita "perder" o evento)
    const emailForRevoke = purchase?.email ?? parsed.email;
    if (!purchase) {
      await supabase.from("kiwify_purchases").upsert(
        {
          order_id: parsed.orderId,
          product_id: parsed.productId || null,
          email: parsed.email,
          status: newStatus,
          purchased_at: parsed.purchasedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );
    } else {
      await supabase.from("kiwify_purchases").update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("order_id", parsed.orderId);
    }

    // Revogação segura: delega ao SQL (que preserva Stripe/outra compra ativa).
    // Chama a função via update direto com lógica espelhada aqui para não depender de RPC:
    const { data: acc } = await supabase
      .from("accounts")
      .select("id, status, stripe_subscription_id, stripe_customer_id, access_source, demo_expires_at")
      .ilike("email", emailForRevoke)
      .maybeSingle();

    if (acc) {
      // Há outra compra ativa deste e-mail? Se sim, mantém acesso.
      const { data: otherActive } = await supabase
        .from("kiwify_purchases")
        .select("id")
        .ilike("email", emailForRevoke)
        .eq("status", "active")
        .limit(1);
      const hasOtherKiwify = (otherActive?.length ?? 0) > 0;
      const hasStripe = !!(acc.stripe_subscription_id || acc.stripe_customer_id);

      if (!hasOtherKiwify && !hasStripe) {
        // Sem outra fonte: expira. Só mexe se a fonte era kiwify (não quebra demo/stripe alheios).
        if (acc.access_source === "kiwify" || acc.status === "active") {
          await supabase.from("accounts").update({
            status: "expired",
            updated_at: new Date().toISOString(),
          }).eq("id", acc.id);
        }
      } else if (hasStripe && !hasOtherKiwify) {
        // Mantém Stripe: só limpa marcador kiwify
        if (acc.access_source === "kiwify") {
          await supabase.from("accounts").update({
            access_source: "stripe",
            updated_at: new Date().toISOString(),
          }).eq("id", acc.id);
        }
      }
      // se hasOtherKiwify: não faz nada (outro pedido ativo sustenta o acesso)
    }

    return Response.json({ ok: true, action: `purchase_${newStatus}_processed` }, { status: 200 });
  } catch (e) {
    console.error("[kiwify-webhook] fatal", e);
    return Response.json({ error: "internal" }, { status: 500 });
  }
});
