-- PAGOU security/performance hardening
-- Mirrors the production changes applied on 2026-11-17.
-- Safe to re-run: indexes are IF NOT EXISTS and policies preserve their predicates.

-- Cover foreign-key columns used by joins, deletes and RLS checks.
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists checkin_authorizations_event_id_idx on public.checkin_authorizations (event_id);
create index if not exists checkins_checked_by_idx on public.checkins (checked_by);
create index if not exists checkins_event_id_idx on public.checkins (event_id);
create index if not exists coupon_uses_coupon_id_idx on public.coupon_uses (coupon_id);
create index if not exists coupon_uses_order_id_idx on public.coupon_uses (order_id);
create index if not exists coupon_uses_user_id_idx on public.coupon_uses (user_id);
create index if not exists coupons_seller_id_idx on public.coupons (seller_id);
create index if not exists course_lessons_module_id_idx on public.course_lessons (module_id);
create index if not exists course_modules_course_id_idx on public.course_modules (course_id);
create index if not exists courses_seller_id_idx on public.courses (seller_id);
create index if not exists enrollments_course_id_idx on public.enrollments (course_id);
create index if not exists enrollments_order_id_idx on public.enrollments (order_id);
create index if not exists events_seller_id_idx on public.events (seller_id);
create index if not exists order_items_course_id_idx on public.order_items (course_id);
create index if not exists order_items_event_id_idx on public.order_items (event_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists order_items_ticket_batch_id_idx on public.order_items (ticket_batch_id);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists products_seller_id_idx on public.products (seller_id);
create index if not exists refunds_payment_id_idx on public.refunds (payment_id);
create index if not exists refunds_requested_by_idx on public.refunds (requested_by);
create index if not exists stock_reservations_order_id_idx on public.stock_reservations (order_id);
create index if not exists ticket_batches_ticket_type_id_idx on public.ticket_batches (ticket_type_id);
create index if not exists ticket_types_event_id_idx on public.ticket_types (event_id);
create index if not exists tickets_buyer_id_idx on public.tickets (buyer_id);
create index if not exists tickets_event_id_idx on public.tickets (event_id);
create index if not exists tickets_order_item_id_idx on public.tickets (order_item_id);

-- Supabase/Postgres can evaluate auth.uid() once per statement instead of once
-- per row when it is wrapped in a scalar SELECT. Preserve all policy semantics.
do $$
declare
  p record;
  statement text;
  new_qual text;
  new_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    new_qual := case
      when p.qual is null then null
      else replace(p.qual, 'auth.uid()', '(select auth.uid())')
    end;
    new_check := case
      when p.with_check is null then null
      else replace(p.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    statement := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if new_qual is not null then
      statement := statement || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      statement := statement || format(' with check (%s)', new_check);
    end if;
    execute statement;
  end loop;
end
$$;
