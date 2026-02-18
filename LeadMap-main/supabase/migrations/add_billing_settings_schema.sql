-- ============================================================================
-- Billing settings schema for /dashboard/settings Billing section.
-- Billing address, payment method display, subscription renewal, and invoices.
-- ============================================================================

-- Billing address (display / tax)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_company_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_country TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS billing_tax_id TEXT;

-- Payment method display only (last4, brand, exp – tokens stay in payment provider)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_method_brand TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_method_exp_month SMALLINT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_method_exp_year SMALLINT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_method_is_default BOOLEAN DEFAULT true;

-- Subscription / plan display (renewal date, plan name, price for UI)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_display_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_price_cents INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_usage_percent INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_usage_limit INTEGER;

COMMENT ON COLUMN public.users.billing_company_name IS 'Billing company or name (Settings > Billing)';
COMMENT ON COLUMN public.users.billing_address_line1 IS 'Billing street address line 1';
COMMENT ON COLUMN public.users.billing_address_line2 IS 'Billing street address line 2 (suite, etc.)';
COMMENT ON COLUMN public.users.billing_city IS 'Billing city';
COMMENT ON COLUMN public.users.billing_state IS 'Billing state / region';
COMMENT ON COLUMN public.users.billing_postal_code IS 'Billing postal code';
COMMENT ON COLUMN public.users.billing_country IS 'Billing country';
COMMENT ON COLUMN public.users.billing_tax_id IS 'Tax ID / VAT (Settings > Billing)';
COMMENT ON COLUMN public.users.payment_method_brand IS 'Card brand for display (e.g. Visa)';
COMMENT ON COLUMN public.users.payment_method_last4 IS 'Last 4 digits of payment method for display';
COMMENT ON COLUMN public.users.payment_method_exp_month IS 'Expiry month (1-12) for display';
COMMENT ON COLUMN public.users.payment_method_exp_year IS 'Expiry year for display';
COMMENT ON COLUMN public.users.payment_method_is_default IS 'Whether this is the default payment method';
COMMENT ON COLUMN public.users.subscription_renews_at IS 'When the current subscription period ends (Settings > Billing)';
COMMENT ON COLUMN public.users.plan_display_name IS 'Plan name for display (e.g. Pro Plan)';
COMMENT ON COLUMN public.users.plan_price_cents IS 'Plan price in cents for display';
COMMENT ON COLUMN public.users.plan_usage_percent IS 'Current plan usage percentage (e.g. contacts used)';
COMMENT ON COLUMN public.users.plan_usage_limit IS 'Plan usage limit (e.g. monthly contact cap)';

-- Invoices cache for Settings > Billing (optional; can be populated from Stripe webhooks or API)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'paid',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id ON public.billing_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_invoice_date ON public.billing_invoices(invoice_date DESC);

COMMENT ON TABLE public.billing_invoices IS 'Cached invoice rows for Billing settings (populated from payment provider)';
COMMENT ON COLUMN public.billing_invoices.external_id IS 'External invoice ID (e.g. Stripe invoice ID)';
COMMENT ON COLUMN public.billing_invoices.invoice_number IS 'Display number (e.g. INV-2024-001)';
COMMENT ON COLUMN public.billing_invoices.pdf_url IS 'Optional URL to download PDF';

-- RLS: users can only see their own invoices
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_invoices_select_own ON public.billing_invoices
  FOR SELECT
  USING (auth.uid() = user_id);
