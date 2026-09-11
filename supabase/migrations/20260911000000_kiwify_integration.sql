-- Migration: Kiwify integration (idempotent, safe to re-run)
-- NÃO recria o que já existe. Preserva Stripe + demo + view account_access.
-- Aplicar via: supabase db push  (ou Dashboard > SQL Editor)

-- 1) Colunas em accounts (só adiciona se faltar)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS kiwify_order_id text UNIQUE;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS kiwify_product_id text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS kiwify_purchased_at timestamptz;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS access_source text;

-- 2) Tabela de compras (só cria se faltar)
CREATE TABLE IF NOT EXISTS public.kiwify_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  product_id text,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'refunded', 'chargeback')),
  purchased_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_email ON public.kiwify_purchases (lower(email));
CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_status ON public.kiwify_purchases (status);
CREATE INDEX IF NOT EXISTS idx_accounts_email_lower ON public.accounts (lower(email));

-- 3) RLS: kiwify_purchases NUNCA legível/gravável pelo cliente.
ALTER TABLE public.kiwify_purchases ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas permissivas se existirem (recria do zero, restritivo)
DROP POLICY IF EXISTS "kiwify_purchases_no_client_read" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "kiwify_purchases_no_client_write" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "Allow all for service_role only" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "public read" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "authenticated read" ON public.kiwify_purchases;

-- Por padrão, sem policy de SELECT/INSERT/UPDATE/DELETE para anon/authenticated = negado.
-- Service_role bypassa RLS, então a Edge Function continua funcionando.
-- Criamos policies explícitas DENY via (USING false) para deixar a intenção auditável:
CREATE POLICY "kiwify_purchases_no_client_read"
  ON public.kiwify_purchases FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "kiwify_purchases_no_client_write"
  ON public.kiwify_purchases FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 4) Proteção de colunas sensíveis em accounts contra auto-elevação pelo cliente.
-- Permite que service_role (Edge Functions Stripe/Kiwify) altere livremente,
-- mas impede que um usuário authenticated altere status/access_source/kiwify_*/stripe_* de si mesmo.
CREATE OR REPLACE FUNCTION public.prevent_client_access_escalation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  jwt_role text;
BEGIN
  BEGIN
    jwt_role := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;

  -- service_role e postgres (migrations/webhook) podem tudo
  IF jwt_role IN ('service_role') OR current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status
      OR OLD.access_source IS DISTINCT FROM NEW.access_source
      OR OLD.kiwify_order_id IS DISTINCT FROM NEW.kiwify_order_id
      OR OLD.kiwify_product_id IS DISTINCT FROM NEW.kiwify_product_id
      OR OLD.kiwify_purchased_at IS DISTINCT FROM NEW.kiwify_purchased_at
      OR OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id
      OR OLD.stripe_subscription_id IS DISTINCT FROM NEW.stripe_subscription_id) THEN
    RAISE EXCEPTION 'forbidden: access fields can only be changed server-side' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_protect_access ON public.accounts;
CREATE TRIGGER trg_accounts_protect_access
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_access_escalation();

-- 5) Caso B: conta criada DEPOIS da compra -> ativa automaticamente (server-side).
-- Complementar ao trigger já existente que cria accounts/account_usage. Não o substitui.
CREATE OR REPLACE FUNCTION public.reconcile_kiwify_on_account_create()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_purchase public.kiwify_purchases%ROWTYPE;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_purchase
  FROM public.kiwify_purchases
  WHERE lower(email) = lower(NEW.email)
    AND status = 'active'
  ORDER BY purchased_at DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    NEW.status := 'active';
    NEW.access_source := 'kiwify';
    NEW.kiwify_order_id := v_purchase.order_id;
    NEW.kiwify_product_id := v_purchase.product_id;
    NEW.kiwify_purchased_at := v_purchase.purchased_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_reconcile_kiwify ON public.accounts;
CREATE TRIGGER trg_accounts_reconcile_kiwify
  BEFORE INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.reconcile_kiwify_on_account_create();

-- 6) updated_at automático em kiwify_purchases
CREATE OR REPLACE FUNCTION public.touch_kiwify_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_kiwify_touch ON public.kiwify_purchases;
CREATE TRIGGER trg_kiwify_touch
  BEFORE UPDATE ON public.kiwify_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_kiwify_updated_at();

-- 7) Verificação: a VIEW account_access permanece INALTERADA e continua sendo a fonte de verdade.
-- SELECT ... FROM accounts com CASE status='active' -> true; demo válido -> true.
-- Como o webhook grava accounts.status='active', has_access vira true automaticamente.
