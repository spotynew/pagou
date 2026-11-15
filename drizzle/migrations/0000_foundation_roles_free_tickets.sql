CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, cpf, phone, postal_code, street, address_number,
    complement, neighborhood, city, state
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), NEW.email),
    NEW.email,
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '\\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'postal_code', ''), '\\D', '', 'g'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'street'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'address_number'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'complement'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'neighborhood'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'city'), ''),
    NULLIF(upper(trim(NEW.raw_user_meta_data->>'state')), '')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_seller_account(_seller_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _seller_user uuid;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  SELECT user_id INTO _seller_user FROM public.seller_accounts WHERE id = _seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro não encontrado'; END IF;

  UPDATE public.seller_accounts
  SET status = CASE WHEN _approve THEN 'approved'::seller_status ELSE 'suspended'::seller_status END,
      updated_at = now()
  WHERE id = _seller_id;

  IF _seller_user IS NOT NULL THEN
    IF _approve THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (_seller_user, 'producer')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      DELETE FROM public.user_roles WHERE user_id = _seller_user AND role = 'producer';
    END IF;
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, metadata)
  VALUES (
    _uid,
    CASE WHEN _approve THEN 'seller_approved' ELSE 'seller_suspended' END,
    'seller_accounts', _seller_id, jsonb_build_object('user_id', _seller_user)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.review_seller_account(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_seller_account(uuid, boolean) TO authenticated;

DROP POLICY IF EXISTS "seller_manage_own_events" ON public.events;
CREATE POLICY "seller_manage_own_events" ON public.events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = events.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = events.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_own_courses" ON public.courses;
CREATE POLICY "seller_manage_own_courses" ON public.courses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = courses.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = courses.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_products" ON public.products;
CREATE POLICY "seller_manage_products" ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = products.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = products.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_coupons" ON public.coupons;
CREATE POLICY "seller_manage_coupons" ON public.coupons FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = coupons.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = coupons.seller_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_ticket_types" ON public.ticket_types;
CREATE POLICY "seller_manage_ticket_types" ON public.ticket_types FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id = e.seller_id WHERE e.id = ticket_types.event_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id = e.seller_id WHERE e.id = ticket_types.event_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_batches" ON public.ticket_batches;
CREATE POLICY "seller_manage_batches" ON public.ticket_batches FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.events e ON e.id = tt.event_id JOIN public.seller_accounts s ON s.id = e.seller_id WHERE tt.id = ticket_batches.ticket_type_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.events e ON e.id = tt.event_id JOIN public.seller_accounts s ON s.id = e.seller_id WHERE tt.id = ticket_batches.ticket_type_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_modules" ON public.course_modules;
CREATE POLICY "seller_manage_modules" ON public.course_modules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.courses c JOIN public.seller_accounts s ON s.id = c.seller_id WHERE c.id = course_modules.course_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.courses c JOIN public.seller_accounts s ON s.id = c.seller_id WHERE c.id = course_modules.course_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "seller_manage_lessons" ON public.course_lessons;
CREATE POLICY "seller_manage_lessons" ON public.course_lessons FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id JOIN public.seller_accounts s ON s.id = c.seller_id WHERE m.id = course_lessons.module_id AND s.user_id = auth.uid() AND s.status = 'approved'))
WITH CHECK (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id JOIN public.seller_accounts s ON s.id = c.seller_id WHERE m.id = course_lessons.module_id AND s.user_id = auth.uid() AND s.status = 'approved'));

DROP POLICY IF EXISTS "public_view_published_events" ON public.events;
CREATE POLICY "public_view_published_events" ON public.events FOR SELECT TO public
USING (published = true AND (seller_id IS NULL OR EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = events.seller_id AND s.status = 'approved')));

DROP POLICY IF EXISTS "public_view_published_courses" ON public.courses;
CREATE POLICY "public_view_published_courses" ON public.courses FOR SELECT TO public
USING (published = true AND (seller_id IS NULL OR EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = courses.seller_id AND s.status = 'approved')));

DROP POLICY IF EXISTS "public_view_published_products" ON public.products;
CREATE POLICY "public_view_published_products" ON public.products FOR SELECT TO public
USING (published = true AND (seller_id IS NULL OR EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = products.seller_id AND s.status = 'approved')));

DROP POLICY IF EXISTS "public_view_ticket_types" ON public.ticket_types;
CREATE POLICY "public_view_ticket_types" ON public.ticket_types FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_types.event_id AND e.published = true AND (e.seller_id IS NULL OR EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = e.seller_id AND s.status = 'approved'))));

DROP POLICY IF EXISTS "public_view_batches" ON public.ticket_batches;
CREATE POLICY "public_view_batches" ON public.ticket_batches FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.events e ON e.id = tt.event_id WHERE tt.id = ticket_batches.ticket_type_id AND e.published = true AND (e.seller_id IS NULL OR EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = e.seller_id AND s.status = 'approved'))));

CREATE OR REPLACE FUNCTION public.issue_free_event_tickets(
  _event_id uuid,
  _batch_id uuid,
  _quantity integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _buyer_id uuid := auth.uid();
  _order_id uuid := gen_random_uuid();
  _order_item_id uuid;
  _seller_id uuid;
  _seller_approved boolean;
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
  _index integer;
  _code text;
BEGIN
  IF _buyer_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _quantity < 1 OR _quantity > 10 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

  SELECT e.seller_id, e.title, e.published, tt.name, b.name, b.price_cents,
         b.quantity_total, b.quantity_sold, b.active, b.max_per_order,
         b.starts_at, b.ends_at,
         (e.seller_id IS NULL OR EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = e.seller_id AND s.status = 'approved'))
  INTO _seller_id, _event_title, _event_published, _ticket_type_name,
       _batch_name, _batch_price, _batch_total, _batch_sold, _batch_active,
       _batch_max, _batch_starts, _batch_ends, _seller_approved
  FROM public.ticket_batches b
  JOIN public.ticket_types tt ON tt.id = b.ticket_type_id
  JOIN public.events e ON e.id = tt.event_id
  WHERE b.id = _batch_id AND e.id = _event_id
  FOR UPDATE OF b;

  IF NOT FOUND OR NOT _event_published OR NOT _batch_active OR NOT _seller_approved THEN
    RAISE EXCEPTION 'Evento ou lote indisponível';
  END IF;
  IF _batch_price <> 0 THEN RAISE EXCEPTION 'Este lote exige pagamento'; END IF;
  IF _batch_starts IS NOT NULL AND _batch_starts > now() THEN RAISE EXCEPTION 'Lote ainda não está disponível'; END IF;
  IF _batch_ends IS NOT NULL AND _batch_ends < now() THEN RAISE EXCEPTION 'Lote encerrado'; END IF;
  IF _quantity > LEAST(COALESCE(_batch_max, 10), 10) THEN RAISE EXCEPTION 'Quantidade acima do limite por pedido'; END IF;

  UPDATE public.stock_reservations SET released = true
  WHERE ticket_batch_id = _batch_id AND released = false AND expires_at <= now();
  SELECT COALESCE(sum(quantity), 0)::integer INTO _reserved
  FROM public.stock_reservations
  WHERE ticket_batch_id = _batch_id AND released = false AND expires_at > now();
  IF _quantity > (_batch_total - _batch_sold - _reserved) THEN RAISE EXCEPTION 'Estoque insuficiente para esse lote'; END IF;

  INSERT INTO public.orders (
    id, buyer_id, seller_id, status, subtotal_cents, discount_cents,
    fee_cents, platform_fee_cents, payment_fee_cents, total_cents,
    external_reference, expires_at, paid_at
  ) VALUES (
    _order_id, _buyer_id, _seller_id, 'paid', 0, 0,
    0, 0, 0, 0, 'free:' || _order_id::text, now(), now()
  );

  INSERT INTO public.order_items (
    order_id, event_id, ticket_batch_id, title, quantity, unit_price_cents, total_cents
  ) VALUES (
    _order_id, _event_id, _batch_id,
    _event_title || ' · ' || _ticket_type_name || ' · ' || _batch_name,
    _quantity, 0, 0
  ) RETURNING id INTO _order_item_id;

  FOR _index IN 1.._quantity LOOP
    _code := 'PGU-' || upper(encode(extensions.gen_random_bytes(10), 'hex'));
    INSERT INTO public.tickets(order_item_id, event_id, buyer_id, code, holder_name, batch_name, sector)
    SELECT _order_item_id, _event_id, _buyer_id, _code, p.full_name, _batch_name, tt.sector
    FROM public.ticket_types tt
    LEFT JOIN public.profiles p ON p.id = _buyer_id
    WHERE tt.event_id = _event_id AND tt.id = (SELECT ticket_type_id FROM public.ticket_batches WHERE id = _batch_id);
  END LOOP;

  UPDATE public.ticket_batches SET quantity_sold = quantity_sold + _quantity WHERE id = _batch_id;
  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, metadata)
  VALUES (_buyer_id, 'free_tickets_issued', 'orders', _order_id,
    jsonb_build_object('event_id', _event_id, 'ticket_batch_id', _batch_id, 'quantity', _quantity));
  RETURN _order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_free_event_tickets(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_free_event_tickets(uuid, uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.redeem_ticket(_code text)
RETURNS TABLE (result text, ticket_id uuid, event_id uuid, event_title text, holder_name text, sector text, checked_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket public.tickets%ROWTYPE;
  _event_title text;
  _previous_checkin timestamptz;
  _now timestamptz := now();
  _authorized boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _ticket FROM public.tickets t WHERE upper(t.code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;
  SELECT e.title INTO _event_title FROM public.events e WHERE e.id = _ticket.event_id;

  _authorized := public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'checkin_staff') AND EXISTS (SELECT 1 FROM public.checkin_authorizations ca WHERE ca.user_id = auth.uid() AND ca.event_id = _ticket.event_id))
    OR (public.has_role(auth.uid(), 'producer') AND EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id = e.seller_id WHERE e.id = _ticket.event_id AND s.user_id = auth.uid() AND s.status = 'approved'));
  IF NOT _authorized THEN
    RETURN QUERY SELECT 'unauthorized'::text, _ticket.id, _ticket.event_id, _event_title, _ticket.holder_name, _ticket.sector, NULL::timestamptz;
    RETURN;
  END IF;
  IF _ticket.status = 'cancelled' THEN
    RETURN QUERY SELECT 'cancelled'::text, _ticket.id, _ticket.event_id, _event_title, _ticket.holder_name, _ticket.sector, NULL::timestamptz;
    RETURN;
  END IF;
  SELECT c.checked_at INTO _previous_checkin FROM public.checkins c WHERE c.ticket_id = _ticket.id;
  IF _ticket.status = 'used' OR _previous_checkin IS NOT NULL THEN
    RETURN QUERY SELECT 'used'::text, _ticket.id, _ticket.event_id, _event_title, _ticket.holder_name, _ticket.sector, _previous_checkin;
    RETURN;
  END IF;
  INSERT INTO public.checkins (ticket_id, event_id, checked_by, checked_at) VALUES (_ticket.id, _ticket.event_id, auth.uid(), _now);
  UPDATE public.tickets SET status = 'used' WHERE id = _ticket.id;
  INSERT INTO public.audit_logs (actor_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'ticket_redeemed', 'tickets', _ticket.id, jsonb_build_object('event_id', _ticket.event_id, 'code_suffix', right(_ticket.code, 6)));
  RETURN QUERY SELECT 'accepted'::text, _ticket.id, _ticket.event_id, _event_title, _ticket.holder_name, _ticket.sector, _now;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_ticket(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_ticket(text) TO authenticated;