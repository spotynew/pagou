
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

CREATE OR REPLACE FUNCTION public.request_seller_account(
  _display_name text,
  _legal_name text,
  _document text,
  _bio text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _doc text := regexp_replace(COALESCE(_document, ''), '\D', '', 'g');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF length(trim(COALESCE(_display_name,''))) < 2 THEN RAISE EXCEPTION 'Nome público inválido'; END IF;
  IF length(trim(COALESCE(_legal_name,''))) < 2 THEN RAISE EXCEPTION 'Informe o nome legal'; END IF;
  IF length(_doc) NOT IN (11, 14) THEN RAISE EXCEPTION 'CPF ou CNPJ inválido'; END IF;

  INSERT INTO public.seller_accounts (user_id, display_name, legal_name, document, bio, status)
  VALUES (_uid, trim(_display_name), trim(_legal_name), _doc, NULLIF(trim(COALESCE(_bio,'')), ''), 'pending')
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        legal_name   = EXCLUDED.legal_name,
        document     = EXCLUDED.document,
        bio          = EXCLUDED.bio,
        status       = CASE WHEN public.seller_accounts.status = 'approved'
                            THEN public.seller_accounts.status ELSE 'pending' END,
        updated_at   = now()
  RETURNING id INTO _id;

  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.request_seller_account(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_seller_account(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_seller_account(
  _seller_id uuid,
  _approve boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _seller_user uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Apenas administradores'; END IF;

  SELECT user_id INTO _seller_user FROM public.seller_accounts WHERE id = _seller_id;
  IF _seller_user IS NULL THEN RAISE EXCEPTION 'Cadastro não encontrado'; END IF;

  UPDATE public.seller_accounts
    SET status = CASE WHEN _approve THEN 'approved'::seller_status ELSE 'rejected'::seller_status END,
        updated_at = now()
  WHERE id = _seller_id;

  IF _approve THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_seller_user, 'producer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, target_table, target_id, metadata)
  VALUES (_uid, CASE WHEN _approve THEN 'seller_approved' ELSE 'seller_rejected' END,
          'seller_accounts', _seller_id, jsonb_build_object('user_id', _seller_user));
END; $$;

REVOKE ALL ON FUNCTION public.review_seller_account(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_seller_account(uuid, boolean) TO authenticated;
