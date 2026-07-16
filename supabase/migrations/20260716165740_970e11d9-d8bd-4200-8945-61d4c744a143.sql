
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('buyer','seller','admin','checkin');
CREATE TYPE public.product_kind AS ENUM ('event','course','digital');
CREATE TYPE public.order_status AS ENUM ('pending','paid','cancelled','refunded','expired');
CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected','refunded');
CREATE TYPE public.payment_method AS ENUM ('pix','credit_card');
CREATE TYPE public.ticket_status AS ENUM ('valid','used','cancelled');
CREATE TYPE public.seller_status AS ENUM ('pending','approved','suspended');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  cpf TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "admins_view_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-cria profile + role buyer no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SELLER ACCOUNTS ============
CREATE TABLE public.seller_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  document TEXT,
  bio TEXT,
  avatar_url TEXT,
  status public.seller_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_accounts TO anon, authenticated;
GRANT INSERT, UPDATE ON public.seller_accounts TO authenticated;
GRANT ALL ON public.seller_accounts TO service_role;
ALTER TABLE public.seller_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_approved_sellers" ON public.seller_accounts FOR SELECT
  USING (status = 'approved');
CREATE POLICY "own_seller_view" ON public.seller_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_seller_insert" ON public.seller_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_seller_update" ON public.seller_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin_seller_all" ON public.seller_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER seller_accounts_updated BEFORE UPDATE ON public.seller_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.seller_accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT,
  city TEXT,
  venue TEXT,
  address TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  age_rating TEXT,
  producer_name TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_published_events" ON public.events FOR SELECT USING (published = true);
CREATE POLICY "seller_view_own_events" ON public.events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = events.seller_id AND s.user_id = auth.uid()));
CREATE POLICY "seller_manage_own_events" ON public.events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = events.seller_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = events.seller_id AND s.user_id = auth.uid()));
CREATE POLICY "admin_events_all" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TICKET TYPES ============
CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_types TO authenticated;
GRANT ALL ON public.ticket_types TO service_role;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_ticket_types" ON public.ticket_types FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_types.event_id AND e.published = true));
CREATE POLICY "seller_manage_ticket_types" ON public.ticket_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id=e.seller_id WHERE e.id=ticket_types.event_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id=e.seller_id WHERE e.id=ticket_types.event_id AND s.user_id=auth.uid()));
CREATE POLICY "admin_ticket_types_all" ON public.ticket_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TICKET BATCHES ============
CREATE TABLE public.ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  quantity_total INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_batches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_batches TO authenticated;
GRANT ALL ON public.ticket_batches TO service_role;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_batches" ON public.ticket_batches FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.events e ON e.id=tt.event_id WHERE tt.id=ticket_batches.ticket_type_id AND e.published=true));
CREATE POLICY "seller_manage_batches" ON public.ticket_batches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.events e ON e.id=tt.event_id JOIN public.seller_accounts s ON s.id=e.seller_id WHERE tt.id=ticket_batches.ticket_type_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ticket_types tt JOIN public.events e ON e.id=tt.event_id JOIN public.seller_accounts s ON s.id=e.seller_id WHERE tt.id=ticket_batches.ticket_type_id AND s.user_id=auth.uid()));
CREATE POLICY "admin_batches_all" ON public.ticket_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ COURSES ============
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.seller_accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT,
  instructor_name TEXT,
  duration_hours NUMERIC(6,1),
  price_cents INTEGER NOT NULL DEFAULT 0,
  producer_name TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_published_courses" ON public.courses FOR SELECT USING (published = true);
CREATE POLICY "seller_view_own_courses" ON public.courses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = courses.seller_id AND s.user_id = auth.uid()));
CREATE POLICY "seller_manage_own_courses" ON public.courses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = courses.seller_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id = courses.seller_id AND s.user_id = auth.uid()));
CREATE POLICY "admin_courses_all" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COURSE MODULES / LESSONS ============
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.course_modules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_modules" ON public.course_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id AND c.published = true));
CREATE POLICY "seller_manage_modules" ON public.course_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c JOIN public.seller_accounts s ON s.id=c.seller_id WHERE c.id=course_modules.course_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c JOIN public.seller_accounts s ON s.id=c.seller_id WHERE c.id=course_modules.course_id AND s.user_id=auth.uid()));

CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER,
  video_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.course_lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
-- Aula: público vê metadados; conteúdo (video_url) só será liberado via edge function checando enrollment
CREATE POLICY "public_view_lessons" ON public.course_lessons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id=m.course_id WHERE m.id=course_lessons.module_id AND c.published=true));
CREATE POLICY "seller_manage_lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id=m.course_id JOIN public.seller_accounts s ON s.id=c.seller_id WHERE m.id=course_lessons.module_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id=m.course_id JOIN public.seller_accounts s ON s.id=c.seller_id WHERE m.id=course_lessons.module_id AND s.user_id=auth.uid()));

-- ============ PRODUCTS (digitais) ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.seller_accounts(id) ON DELETE SET NULL,
  kind public.product_kind NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  file_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_published_products" ON public.products FOR SELECT USING (published=true);
CREATE POLICY "seller_manage_products" ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id=products.seller_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id=products.seller_id AND s.user_id=auth.uid()));

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  buyer_name TEXT,
  buyer_cpf TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  coupon_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_view_own_orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid()=buyer_id);
CREATE POLICY "buyer_create_own_orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid()=buyer_id);
CREATE POLICY "buyer_update_own_orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid()=buyer_id);
CREATE POLICY "admin_orders_all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ticket_batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_view_own_items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_items.order_id AND o.buyer_id=auth.uid()));
CREATE POLICY "seller_view_items" ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id=e.seller_id WHERE e.id=order_items.event_id AND s.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c JOIN public.seller_accounts s ON s.id=c.seller_id WHERE c.id=order_items.course_id AND s.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.products p JOIN public.seller_accounts s ON s.id=p.seller_id WHERE p.id=order_items.product_id AND s.user_id=auth.uid())
  );
CREATE POLICY "buyer_create_items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_items.order_id AND o.buyer_id=auth.uid()));
CREATE POLICY "admin_items_all" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL,
  provider TEXT DEFAULT 'mercado_pago',
  provider_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_view_own_payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=payments.order_id AND o.buyer_id=auth.uid()));
CREATE POLICY "admin_payments_all" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TICKETS ============
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  holder_name TEXT,
  sector TEXT,
  batch_name TEXT,
  status public.ticket_status NOT NULL DEFAULT 'valid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_view_own_tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid()=buyer_id);
CREATE POLICY "seller_view_event_tickets" ON public.tickets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.seller_accounts s ON s.id=e.seller_id WHERE e.id=tickets.event_id AND s.user_id=auth.uid()));
CREATE POLICY "checkin_view_tickets" ON public.tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'checkin'));
CREATE POLICY "admin_tickets_all" ON public.tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ CHECKINS ============
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id)
);
GRANT SELECT, INSERT ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkin_view" ON public.checkins FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'checkin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "checkin_insert" ON public.checkins FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'checkin') OR public.has_role(auth.uid(),'admin'));

-- ============ ENROLLMENTS ============
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, UPDATE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "own_enrollment_update" ON public.enrollments FOR UPDATE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "seller_view_enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c JOIN public.seller_accounts s ON s.id=c.seller_id WHERE c.id=enrollments.course_id AND s.user_id=auth.uid()));

-- ============ COUPONS ============
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.seller_accounts(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER,
  discount_cents INTEGER,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_active_coupons" ON public.coupons FOR SELECT USING (active=true);
CREATE POLICY "seller_manage_coupons" ON public.coupons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id=coupons.seller_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_accounts s WHERE s.id=coupons.seller_id AND s.user_id=auth.uid()));

CREATE TABLE public.coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_uses TO authenticated;
GRANT ALL ON public.coupon_uses TO service_role;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_coupon_uses" ON public.coupon_uses FOR SELECT TO authenticated USING (auth.uid()=user_id);

-- ============ PLATFORM FEES ============
CREATE TABLE public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  percent NUMERIC(5,2) NOT NULL DEFAULT 8.99,
  fixed_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_fees TO anon, authenticated;
GRANT ALL ON public.platform_fees TO service_role;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_fees" ON public.platform_fees FOR SELECT USING (active=true);
CREATE POLICY "admin_manage_fees" ON public.platform_fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ REFUNDS ============
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_view_own_refunds" ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments p JOIN public.orders o ON o.id=p.order_id WHERE p.id=refunds.payment_id AND o.buyer_id=auth.uid()));
CREATE POLICY "admin_refunds_all" ON public.refunds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_view_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "any_authenticated_insert_log" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- ============ SEED (dados fictícios) ============
INSERT INTO public.platform_fees (name, percent, fixed_cents, active)
VALUES ('Padrão', 8.99, 99, true);

-- Produtores fictícios (sem user_id — apenas exibição)
INSERT INTO public.seller_accounts (id, display_name, legal_name, bio, status) VALUES
  ('11111111-1111-1111-1111-111111111111','Produtora Aurora','Aurora Eventos LTDA','Shows e festivais no Sudeste.','approved'),
  ('22222222-2222-2222-2222-222222222222','Estúdio Norte','Norte Educação ME','Cursos online de tecnologia e negócios.','approved'),
  ('33333333-3333-3333-3333-333333333333','Coletivo Sul','Coletivo Sul','Eventos culturais independentes.','approved');

-- Eventos
INSERT INTO public.events (id, seller_id, title, slug, description, cover_url, category, city, venue, address, starts_at, age_rating, producer_name, published, featured) VALUES
 ('a1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Festival Aurora 2026','festival-aurora-2026','Uma noite inesquecível com os maiores nomes do indie brasileiro. Três palcos, food trucks e experiências imersivas.', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200', 'Música','São Paulo','Arena Aurora','Av. das Nações, 1000',  now() + interval '45 days','16 anos','Produtora Aurora', true, true),
 ('a1000000-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','Samba na Praça','samba-na-praca','Roda de samba autoral com convidados especiais. Entrada com couvert artístico.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200', 'Música','Rio de Janeiro','Praça da Harmonia','Praça da Harmonia, s/n', now() + interval '20 days','Livre','Coletivo Sul', true, true),
 ('a1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Stand-Up Comedy Noite','stand-up-comedy-noite','Cinco comediantes em uma noite única. Aberto o bar até meia-noite.', 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200', 'Humor','Belo Horizonte','Teatro Central','Rua da Bahia, 500', now() + interval '10 days','18 anos','Produtora Aurora', true, false),
 ('a1000000-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333','Feira Criativa Sul','feira-criativa-sul','Feira de artesanato, gastronomia e apresentações musicais durante todo o dia.', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200', 'Cultura','Porto Alegre','Parque da Redenção','Av. Osvaldo Aranha', now() + interval '30 days','Livre','Coletivo Sul', true, false);

-- Ticket types + batches
INSERT INTO public.ticket_types (id, event_id, name, sector, sort_order) VALUES
 ('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Pista','Pista', 1),
 ('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','VIP','Camarote', 2),
 ('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','Único','Geral', 1),
 ('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003','Plateia','Plateia', 1),
 ('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000004','Entrada','Geral', 1);

INSERT INTO public.ticket_batches (ticket_type_id, name, price_cents, quantity_total, active, sort_order) VALUES
 ('b1000000-0000-0000-0000-000000000001','1º Lote', 12000, 500, true, 1),
 ('b1000000-0000-0000-0000-000000000001','2º Lote', 15000, 500, true, 2),
 ('b1000000-0000-0000-0000-000000000002','1º Lote', 32000, 100, true, 1),
 ('b1000000-0000-0000-0000-000000000003','Único',    4500, 300, true, 1),
 ('b1000000-0000-0000-0000-000000000004','1º Lote',  6000, 200, true, 1),
 ('b1000000-0000-0000-0000-000000000005','Único',    2500, 400, true, 1);

-- Courses
INSERT INTO public.courses (id, seller_id, title, slug, description, cover_url, category, instructor_name, duration_hours, price_cents, producer_name, published, featured) VALUES
 ('c1000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Fundamentos de Design de Produto','fundamentos-design-produto','Do briefing ao MVP: aprenda o processo completo de descoberta, prototipação e validação com casos reais do mercado brasileiro.', 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200', 'Design','Marina Costa', 22.5, 39900,'Estúdio Norte', true, true),
 ('c1000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Precificação para Autônomos','precificacao-para-autonomos','Como precificar serviços sem se desvalorizar. Planilhas, técnicas e roleplay de negociação.', 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200', 'Negócios','Rafael Lima', 6.0, 14900,'Estúdio Norte', true, true),
 ('c1000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','React Moderno na Prática','react-moderno-na-pratica','Construa uma aplicação real de ponta a ponta com React, TypeScript e boas práticas de arquitetura.', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200', 'Tecnologia','Isadora Prado', 34.0, 49900,'Estúdio Norte', true, false);

INSERT INTO public.course_modules (id, course_id, title, sort_order) VALUES
 ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Descoberta', 1),
 ('d1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','Prototipação', 2),
 ('d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Validação', 3),
 ('d1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Custos e valor', 1),
 ('d1000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000002','Negociação', 2);

INSERT INTO public.course_lessons (module_id, title, duration_minutes, sort_order) VALUES
 ('d1000000-0000-0000-0000-000000000001','Entrevista com stakeholders', 42, 1),
 ('d1000000-0000-0000-0000-000000000001','Mapeando dores', 35, 2),
 ('d1000000-0000-0000-0000-000000000002','Wireframes de baixa fidelidade', 28, 1),
 ('d1000000-0000-0000-0000-000000000002','Prototipação em Figma', 55, 2),
 ('d1000000-0000-0000-0000-000000000003','Testes com usuários', 40, 1),
 ('d1000000-0000-0000-0000-000000000004','Estrutura de custos', 30, 1),
 ('d1000000-0000-0000-0000-000000000005','Ancoragem de preço', 25, 1);
