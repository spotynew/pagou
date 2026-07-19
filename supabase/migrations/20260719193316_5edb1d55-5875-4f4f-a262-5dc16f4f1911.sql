-- Aplica endurecimento de segurança e check-in atômico (com correção do SELECT INTO).

REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stock_reservations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.seller_accounts FROM authenticated;
REVOKE SELECT ON public.coupons FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.enrollments FROM authenticated;

DROP POLICY IF EXISTS "checkin_view_tickets" ON public.tickets;
DROP POLICY IF EXISTS "checkin_view" ON public.checkins;
DROP POLICY IF EXISTS "checkin_insert" ON public.checkins;

CREATE POLICY "authorized_checkin_view_tickets"
ON public.tickets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'checkin_staff')
    AND EXISTS (
      SELECT 1 FROM public.checkin_authorizations ca
      WHERE ca.user_id = auth.uid() AND ca.event_id = tickets.event_id
    )
  )
);

CREATE POLICY "authorized_checkin_view_logs"
ON public.checkins FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'checkin_staff')
    AND EXISTS (
      SELECT 1 FROM public.checkin_authorizations ca
      WHERE ca.user_id = auth.uid() AND ca.event_id = checkins.event_id
    )
  )
);

CREATE OR REPLACE FUNCTION public.redeem_ticket(_code text)
RETURNS TABLE (
  result text,
  ticket_id uuid,
  event_id uuid,
  event_title text,
  holder_name text,
  sector text,
  checked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket public.tickets%ROWTYPE;
  _event_title text;
  _previous_checkin timestamptz;
  _now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _ticket
  FROM public.tickets t
  WHERE upper(t.code) = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::uuid, NULL::text,
      NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT e.title INTO _event_title
  FROM public.events e WHERE e.id = _ticket.event_id;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NOT public.has_role(auth.uid(), 'checkin_staff') OR NOT EXISTS (
      SELECT 1 FROM public.checkin_authorizations ca
      WHERE ca.user_id = auth.uid() AND ca.event_id = _ticket.event_id
    ) THEN
      RETURN QUERY SELECT 'unauthorized'::text, _ticket.id, _ticket.event_id,
        _event_title, _ticket.holder_name, _ticket.sector, NULL::timestamptz;
      RETURN;
    END IF;
  END IF;

  IF _ticket.status = 'cancelled' THEN
    RETURN QUERY SELECT 'cancelled'::text, _ticket.id, _ticket.event_id,
      _event_title, _ticket.holder_name, _ticket.sector, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT c.checked_at INTO _previous_checkin
  FROM public.checkins c
  WHERE c.ticket_id = _ticket.id;

  IF _ticket.status = 'used' OR _previous_checkin IS NOT NULL THEN
    RETURN QUERY SELECT 'used'::text, _ticket.id, _ticket.event_id,
      _event_title, _ticket.holder_name, _ticket.sector, _previous_checkin;
    RETURN;
  END IF;

  INSERT INTO public.checkins (ticket_id, event_id, checked_by, checked_at)
  VALUES (_ticket.id, _ticket.event_id, auth.uid(), _now);

  UPDATE public.tickets SET status = 'used' WHERE id = _ticket.id;

  INSERT INTO public.audit_logs (actor_id, action, target_table, target_id, metadata)
  VALUES (
    auth.uid(),
    'ticket_redeemed',
    'tickets',
    _ticket.id,
    jsonb_build_object('event_id', _ticket.event_id, 'code_suffix', right(_ticket.code, 6))
  );

  RETURN QUERY SELECT 'accepted'::text, _ticket.id, _ticket.event_id,
    _event_title, _ticket.holder_name, _ticket.sector, _now;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_ticket(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_ticket(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_event_draft_order(
  _buyer_id uuid,
  _event_id uuid,
  _batch_id uuid,
  _quantity integer,
  _reservation_minutes integer DEFAULT 15,
  _platform_fee_bps integer DEFAULT 1000
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid := gen_random_uuid();
  _seller_id uuid;
  _event_title text;
  _event_published boolean;
  _ticket_type_name text;
  _batch_name text;
  _batch_price integer;
  _batch_total integer;
  _batch_sold integer;
  _batch_active boolean;
  _batch_max integer;
  _batch_starts timestamptz;
  _batch_ends timestamptz;
  _reserved integer;
  _subtotal integer;
  _platform_fee integer;
  _total integer;
  _expires_at timestamptz;
BEGIN
  IF _quantity < 1 OR _quantity > 10 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  SELECT e.seller_id, e.title, e.published, tt.name, b.name, b.price_cents,
         b.quantity_total, b.quantity_sold, b.active, b.max_per_order,
         b.starts_at, b.ends_at
  INTO _seller_id, _event_title, _event_published, _ticket_type_name,
       _batch_name, _batch_price, _batch_total, _batch_sold, _batch_active,
       _batch_max, _batch_starts, _batch_ends
  FROM public.ticket_batches b
  JOIN public.ticket_types tt ON tt.id = b.ticket_type_id
  JOIN public.events e ON e.id = tt.event_id
  WHERE b.id = _batch_id AND e.id = _event_id
  FOR UPDATE OF b;

  IF NOT FOUND OR NOT _event_published OR NOT _batch_active THEN
    RAISE EXCEPTION 'Evento ou lote indisponível';
  END IF;
  IF _batch_starts IS NOT NULL AND _batch_starts > now() THEN
    RAISE EXCEPTION 'Lote ainda não está à venda';
  END IF;
  IF _batch_ends IS NOT NULL AND _batch_ends < now() THEN
    RAISE EXCEPTION 'Lote encerrado';
  END IF;
  IF _quantity > LEAST(COALESCE(_batch_max, 10), 10) THEN
    RAISE EXCEPTION 'Quantidade acima do limite por pedido';
  END IF;

  UPDATE public.stock_reservations
  SET released = true
  WHERE ticket_batch_id = _batch_id AND released = false AND expires_at <= now();

  SELECT COALESCE(sum(quantity), 0)::integer INTO _reserved
  FROM public.stock_reservations
  WHERE ticket_batch_id = _batch_id AND released = false AND expires_at > now();

  IF _quantity > (_batch_total - _batch_sold - _reserved) THEN
    RAISE EXCEPTION 'Estoque insuficiente para esse lote';
  END IF;

  _subtotal := _batch_price * _quantity;
  _platform_fee := round((_subtotal * _platform_fee_bps)::numeric / 10000)::integer;
  _total := _subtotal + _platform_fee;
  _expires_at := now() + make_interval(mins => _reservation_minutes);

  INSERT INTO public.orders (
    id, buyer_id, seller_id, status, subtotal_cents, discount_cents,
    fee_cents, platform_fee_cents, payment_fee_cents, total_cents,
    external_reference, expires_at
  ) VALUES (
    _order_id, _buyer_id, _seller_id, 'pending', _subtotal, 0,
    _platform_fee, _platform_fee, 0, _total, _order_id::text, _expires_at
  );

  INSERT INTO public.order_items (
    order_id, event_id, ticket_batch_id, title, quantity,
    unit_price_cents, total_cents
  ) VALUES (
    _order_id, _event_id, _batch_id,
    _event_title || ' · ' || _ticket_type_name,
    _quantity, _batch_price, _subtotal
  );

  INSERT INTO public.stock_reservations (
    order_id, ticket_batch_id, quantity, expires_at
  ) VALUES (_order_id, _batch_id, _quantity, _expires_at);

  RETURN _order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_course_draft_order(
  _buyer_id uuid,
  _course_id uuid,
  _reservation_minutes integer DEFAULT 15,
  _platform_fee_bps integer DEFAULT 1000
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid := gen_random_uuid();
  _seller_id uuid;
  _title text;
  _price integer;
  _published boolean;
  _platform_fee integer;
  _total integer;
  _expires_at timestamptz;
BEGIN
  SELECT seller_id, title, price_cents, published
  INTO _seller_id, _title, _price, _published
  FROM public.courses WHERE id = _course_id;

  IF NOT FOUND OR NOT _published THEN RAISE EXCEPTION 'Curso indisponível'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _buyer_id AND course_id = _course_id
  ) THEN
    RAISE EXCEPTION 'Você já é aluno desse curso';
  END IF;

  _platform_fee := round((_price * _platform_fee_bps)::numeric / 10000)::integer;
  _total := _price + _platform_fee;
  _expires_at := now() + make_interval(mins => _reservation_minutes);

  INSERT INTO public.orders (
    id, buyer_id, seller_id, status, subtotal_cents, discount_cents,
    fee_cents, platform_fee_cents, payment_fee_cents, total_cents,
    external_reference, expires_at
  ) VALUES (
    _order_id, _buyer_id, _seller_id, 'pending', _price, 0,
    _platform_fee, _platform_fee, 0, _total, _order_id::text, _expires_at
  );

  INSERT INTO public.order_items (
    order_id, course_id, title, quantity, unit_price_cents, total_cents
  ) VALUES (_order_id, _course_id, _title, 1, _price, _price);

  RETURN _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_event_draft_order(uuid, uuid, uuid, integer, integer, integer)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_course_draft_order(uuid, uuid, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_draft_order(uuid, uuid, uuid, integer, integer, integer)
TO service_role;
GRANT EXECUTE ON FUNCTION public.create_course_draft_order(uuid, uuid, integer, integer)
TO service_role;

CREATE OR REPLACE FUNCTION public.on_payment_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders%ROWTYPE;
  _item public.order_items%ROWTYPE;
  _batch public.ticket_batches%ROWTYPE;
  _index integer;
  _code text;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT * INTO _order FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  IF NOT FOUND OR _order.status = 'paid' THEN RETURN NEW; END IF;

  IF NEW.amount_cents <> _order.total_cents THEN
    INSERT INTO public.audit_logs (action, target_table, target_id, metadata)
    VALUES ('approved_payment_amount_mismatch', 'orders', _order.id,
      jsonb_build_object('expected_cents', _order.total_cents, 'received_cents', NEW.amount_cents));
    RETURN NEW;
  END IF;

  FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.order_id LOOP
    IF _item.ticket_batch_id IS NOT NULL THEN
      SELECT * INTO _batch FROM public.ticket_batches
      WHERE id = _item.ticket_batch_id FOR UPDATE;
      IF NOT FOUND OR _batch.quantity_sold + _item.quantity > _batch.quantity_total THEN
        INSERT INTO public.audit_logs (action, target_table, target_id, metadata)
        VALUES ('approved_payment_stock_conflict', 'orders', _order.id,
          jsonb_build_object('ticket_batch_id', _item.ticket_batch_id,
            'quantity', _item.quantity, 'provider_payment_id', NEW.provider_payment_id));
        RETURN NEW;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET status = 'paid', paid_at = COALESCE(NEW.paid_at, now()), updated_at = now()
  WHERE id = NEW.order_id;

  FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.order_id LOOP
    IF _item.event_id IS NOT NULL AND _item.ticket_batch_id IS NOT NULL THEN
      FOR _index IN 1.._item.quantity LOOP
        _code := 'PGU-' || upper(encode(gen_random_bytes(10), 'hex'));
        INSERT INTO public.tickets(order_item_id, event_id, buyer_id, code, batch_name, sector)
        SELECT _item.id, _item.event_id, _order.buyer_id, _code, b.name, tt.sector
        FROM public.ticket_batches b
        JOIN public.ticket_types tt ON tt.id = b.ticket_type_id
        WHERE b.id = _item.ticket_batch_id;
      END LOOP;
      UPDATE public.ticket_batches
      SET quantity_sold = quantity_sold + _item.quantity
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

CREATE OR REPLACE FUNCTION public.on_payment_refunded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer_id uuid;
BEGIN
  IF NEW.status <> 'refunded'
     OR (TG_OP = 'UPDATE' AND OLD.status = 'refunded') THEN
    RETURN NEW;
  END IF;

  SELECT buyer_id INTO _buyer_id FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  UPDATE public.orders SET status = 'refunded', updated_at = now() WHERE id = NEW.order_id;
  UPDATE public.tickets SET status = 'cancelled'
  WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = NEW.order_id);
  DELETE FROM public.enrollments WHERE order_id = NEW.order_id;
  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, metadata)
  VALUES (_buyer_id, 'payment_refunded', 'payments', NEW.id,
    jsonb_build_object('order_id', NEW.order_id, 'amount_cents', NEW.amount_cents));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_on_refunded ON public.payments;
CREATE TRIGGER payments_on_refunded
AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.on_payment_refunded();

REVOKE ALL ON FUNCTION public.on_payment_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_payment_refunded() FROM PUBLIC, anon, authenticated;