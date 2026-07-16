
-- 1) Ajusta datas/horas dos eventos para horários redondos em America/Sao_Paulo
UPDATE public.events SET starts_at = (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '45 days' + interval '20 hours') AT TIME ZONE 'America/Sao_Paulo' WHERE id = 'a1000000-0000-0000-0000-000000000001';
UPDATE public.events SET starts_at = (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '20 days' + interval '19 hours') AT TIME ZONE 'America/Sao_Paulo' WHERE id = 'a1000000-0000-0000-0000-000000000002';
UPDATE public.events SET starts_at = (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '10 days' + interval '21 hours') AT TIME ZONE 'America/Sao_Paulo' WHERE id = 'a1000000-0000-0000-0000-000000000003';
UPDATE public.events SET starts_at = (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '30 days' + interval '15 hours') AT TIME ZONE 'America/Sao_Paulo' WHERE id = 'a1000000-0000-0000-0000-000000000004';

-- 2) Tabela de configurações do app (single-row lógica via key)
CREATE TABLE public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  support_email TEXT,
  privacy_email TEXT,
  whatsapp_support TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (id, support_email, privacy_email, whatsapp_support)
VALUES (true, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
