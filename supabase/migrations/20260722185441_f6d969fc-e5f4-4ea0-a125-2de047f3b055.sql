CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.on_payment_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
        _code := 'PGU-' || upper(encode(extensions.gen_random_bytes(10), 'hex'));
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
$function$;