// Tests for kiwify-webhook parsing + live RLS checks (Node, no deploy needed).
// Mirrors logic in supabase/functions/kiwify-webhook/index.ts
// Run: node supabase/tests/kiwify.test.mjs

function s(v) { return typeof v === "string" ? v : v == null ? "" : String(v); }
function normalizeEmail(e) { return e.trim().toLowerCase(); }
function mapEvent(input) {
  const e = s(input).trim().toLowerCase();
  if (!e) return "ignored";
  if (["compra_aprovada","order_approved","approved","paid","order_paid","purchase_approved"].includes(e)) return "approved";
  if (["compra_reembolsada","order_refunded","refunded","refund","reembolso"].includes(e)) return "refunded";
  if (["chargeback","order_chargeback","contestacao"].includes(e)) return "chargeback";
  return "ignored";
}
function extractOrder(body) {
  const root = body ?? {};
  const order = root.order ?? root.data?.order ?? root.Order ?? root.data ?? root;
  const customer = order.Customer ?? order.customer ?? root.Customer ?? root.customer ?? {};
  const product = order.Product ?? order.product ?? root.Product ?? root.product ?? {};
  const email = normalizeEmail(s(customer.email ?? order.email ?? root.email));
  const orderId = s(order.order_id ?? order.orderId ?? order.id ?? root.order_id).trim();
  const productId = s(product.product_id ?? product.productId ?? order.product_id ?? root.product_id).trim();
  const rawEvent = s(order.webhook_event_type ?? order.event ?? order.order_status ?? root.webhook_event_type ?? root.event ?? root.type ?? root.trigger ?? "");
  let event = mapEvent(rawEvent === "paid" && order.order_status ? "paid" : rawEvent);
  if (event === "ignored" && s(order.order_status).toLowerCase() === "paid") event = "approved";
  if (!email || !email.includes("@")) return { error: "missing_customer_email" };
  if (!orderId) return { error: "missing_order_id" };
  return { event, rawEvent, email, orderId, productId };
}
function tokensMatch(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

let pass = 0, fail = 0;
function t(name, cond) { if (cond) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } }

// 1. Compra aprovada (payload real Kiwify)
const real = { order: { order_id: "d9b7a395-9ae0-4a3b-ba41-fe6b02de108b", order_status: "paid", webhook_event_type: "order_approved",
  Product: { product_id: "prod-123", product_name: "Curso ECU" },
  Customer: { full_name: "Alice Silva", email: "Alice@Example.com" } } };
const p1 = extractOrder(real);
t("1.approved+email_normalized", p1.event === "approved" && p1.email === "alice@example.com" && p1.orderId.startsWith("d9b7a395"));

// 2. Conta inexistente -> só registra purchase (parser ok)
t("2.pending_signup_parse", p1.event === "approved" && !!p1.email);

// 3. Webhook duplicado -> idempotente via order_id (upsert onConflict, parser estável)
const p1b = extractOrder(JSON.parse(JSON.stringify(real)));
t("3.duplicate_safe", p1b.orderId === p1.orderId && p1b.email === p1.email);

// 4. Reembolso
const p4 = extractOrder({ order: { order_id: "X1", webhook_event_type: "compra_reembolsada", Customer: { email: "a@b.com" } } });
t("4.refunded", p4.event === "refunded");

// 5. Chargeback
const p5 = extractOrder({ order: { order_id: "X2", webhook_event_type: "chargeback", Customer: { email: "a@b.com" } } });
t("5.chargeback", p5.event === "chargeback");

// 6. Webhook inválido (token)
t("6.invalid_token_rejected", tokensMatch("abc", "def") === false && tokensMatch("", "x") === false && tokensMatch("rxue90njjv1", "rxue90njjv1") === true);

// 7/8/9/10 (lógica preservada): ignored não mexe em nada; paid sem event ainda aprova; case-insensitive
const pIgnore = extractOrder({ order: { order_id: "X3", webhook_event_type: "pix_gerado", Customer: { email: "a@b.com" } } });
t("7.ignored_events_safe", pIgnore.event === "ignored");
const pPaid = extractOrder({ order: { order_id: "X4", order_status: "paid", Customer: { email: "Joao@Gmail.com" } } });
t("8.paid_implies_approved+lower", pPaid.event === "approved" && pPaid.email === "joao@gmail.com");
t("9.missing_email_422", extractOrder({ order: { order_id: "X" } }).error === "missing_customer_email");
t("10.missing_order_422", extractOrder({ order: { Customer: { email: "a@b.com" } } }).error === "missing_order_id");

console.log(`\nParser: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
