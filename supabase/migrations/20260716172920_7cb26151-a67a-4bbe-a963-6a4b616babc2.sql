
-- 1. Rename enum values
ALTER TYPE public.app_role RENAME VALUE 'seller' TO 'producer';
ALTER TYPE public.app_role RENAME VALUE 'checkin' TO 'checkin_staff';

-- 2. Orders new columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.seller_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method,
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.orders SET platform_fee_cents = fee_cents WHERE platform_fee_cents = 0 AND fee_cents > 0;

-- 3. Payments new columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS pix_qr_code text,
  ADD COLUMN IF NOT EXISTS pix_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw_status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_key
  ON public.payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ticket_batches limit per order
ALTER TABLE public.ticket_batches
  ADD COLUMN IF NOT EXISTS max_per_order integer NOT NULL DEFAULT 8;

-- 5. is_demo flags on existing seed catalog
ALTER TABLE public.events   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE public.events   SET is_demo = true WHERE created_at < now();
UPDATE public.courses  SET is_demo = true WHERE created_at < now();
UPDATE public.products SET is_demo = true WHERE created_at < now();

-- 6. Stock reservations
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_batch_id uuid NOT NULL REFERENCES public.ticket_batches(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  expires_at timestamptz NOT NULL,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_reservations TO authenticated;
GRANT ALL ON public.stock_reservations TO service_role;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservations_own_read" ON public.stock_reservations;
CREATE POLICY "reservations_own_read" ON public.stock_reservations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));
DROP POLICY IF EXISTS "reservations_admin_all" ON public.stock_reservations;
CREATE POLICY "reservations_admin_all" ON public.stock_reservations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS stock_reservations_batch_active_idx
  ON public.stock_reservations(ticket_batch_id) WHERE released = false;

-- 7. Checkin authorizations
CREATE TABLE IF NOT EXISTS public.checkin_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);
GRANT SELECT ON public.checkin_authorizations TO authenticated;
GRANT ALL ON public.checkin_authorizations TO service_role;
ALTER TABLE public.checkin_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkin_auth_read_own" ON public.checkin_authorizations;
CREATE POLICY "checkin_auth_read_own" ON public.checkin_authorizations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "checkin_auth_admin_manage" ON public.checkin_authorizations;
CREATE POLICY "checkin_auth_admin_manage" ON public.checkin_authorizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 8. Stock helpers
CREATE OR REPLACE FUNCTION public.available_stock(_batch_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0,
    (SELECT (quantity_total - quantity_sold) FROM public.ticket_batches WHERE id = _batch_id)
    - COALESCE((SELECT SUM(quantity)::int FROM public.stock_reservations
                WHERE ticket_batch_id = _batch_id AND released = false AND expires_at > now()), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_reservations()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.stock_reservations SET released = true
    WHERE released = false AND expires_at <= now();
$$;

-- 9. Extra ticket policy: producers see their event tickets
DROP POLICY IF EXISTS "producer_view_event_tickets" ON public.tickets;
CREATE POLICY "producer_view_event_tickets" ON public.tickets FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.events e
  JOIN public.seller_accounts sa ON sa.id = e.seller_id
  WHERE e.id = tickets.event_id AND sa.user_id = auth.uid()
));

-- 10. Checkins: capture event + validator
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);

-- 11. Trigger: on payment approved -> paid order, tickets, enrollments, audit
CREATE OR REPLACE FUNCTION public.on_payment_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order public.orders%ROWTYPE;
  _item public.order_items%ROWTYPE;
  _i integer;
  _code text;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT * INTO _order FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF _order.status = 'paid' THEN RETURN NEW; END IF;

  UPDATE public.orders SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = NEW.order_id;

  FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.order_id LOOP
    IF _item.event_id IS NOT NULL AND _item.ticket_batch_id IS NOT NULL THEN
      FOR _i IN 1.._item.quantity LOOP
        _code := upper(encode(gen_random_bytes(10), 'hex'));
        INSERT INTO public.tickets(order_item_id, event_id, buyer_id, code, batch_name, sector)
        SELECT _item.id, _item.event_id, _order.buyer_id, _code, b.name, tt.sector
        FROM public.ticket_batches b
        JOIN public.ticket_types tt ON tt.id = b.ticket_type_id
        WHERE b.id = _item.ticket_batch_id;
      END LOOP;
      UPDATE public.ticket_batches SET quantity_sold = quantity_sold + _item.quantity
        WHERE id = _item.ticket_batch_id;
    ELSIF _item.course_id IS NOT NULL THEN
      INSERT INTO public.enrollments(user_id, course_id, order_id)
      VALUES (_order.buyer_id, _item.course_id, _order.id)
      ON CONFLICT (user_id, course_id) DO NOTHING;
    END IF;
  END LOOP;

  UPDATE public.stock_reservations SET released = true WHERE order_id = NEW.order_id;

  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, metadata)
  VALUES (_order.buyer_id, 'payment_approved', 'payments', NEW.id,
    jsonb_build_object('order_id', NEW.order_id, 'amount_cents', NEW.amount_cents));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_on_approved ON public.payments;
CREATE TRIGGER payments_on_approved AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.on_payment_approved();

-- 12. Ensure course enrollment select policy exists
DROP POLICY IF EXISTS "own_enrollment_read" ON public.enrollments;
CREATE POLICY "own_enrollment_read" ON public.enrollments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
