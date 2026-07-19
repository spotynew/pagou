-- Cadastro completo de compradores e solicitação segura de conta de produtor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

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
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'postal_code', ''), '\D', '', 'g'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'street'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'address_number'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'complement'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'neighborhood'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'city'), ''),
    NULLIF(upper(trim(NEW.raw_user_meta_data->>'state')), '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS seller_accounts_one_per_user
  ON public.seller_accounts(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.request_seller_account(
  _display_name text,
  _legal_name text,
  _document text,
  _bio text DEFAULT NULL
)
RETURNS public.seller_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account public.seller_accounts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF length(trim(_display_name)) < 2 OR length(trim(_legal_name)) < 2 THEN
    RAISE EXCEPTION 'Informe o nome público e o nome legal';
  END IF;
  IF length(regexp_replace(COALESCE(_document, ''), '\D', '', 'g')) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'Informe um CPF ou CNPJ válido';
  END IF;

  INSERT INTO public.seller_accounts (user_id, display_name, legal_name, document, bio, status)
  VALUES (
    auth.uid(), trim(_display_name), trim(_legal_name),
    regexp_replace(_document, '\D', '', 'g'), NULLIF(trim(_bio), ''), 'pending'
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
    display_name = EXCLUDED.display_name,
    legal_name = EXCLUDED.legal_name,
    document = EXCLUDED.document,
    bio = EXCLUDED.bio,
    status = CASE WHEN seller_accounts.status = 'approved' THEN 'approved'::seller_status ELSE 'pending'::seller_status END,
    updated_at = now()
  RETURNING * INTO _account;
  RETURN _account;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_seller_account(_seller_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.seller_accounts
  SET status = CASE WHEN _approve THEN 'approved'::seller_status ELSE 'suspended'::seller_status END,
      updated_at = now()
  WHERE id = _seller_id
  RETURNING user_id INTO _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF _approve AND _user_id IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'producer')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF _user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'producer';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_seller_account(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_seller_account(text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_seller_account(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_seller_account(uuid, boolean) TO authenticated;
