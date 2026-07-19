DROP POLICY IF EXISTS "public_view_lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "public_view_modules" ON public.course_modules;

CREATE POLICY "enrolled_view_lessons"
ON public.course_lessons FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.seller_accounts s ON s.id = c.seller_id
    WHERE m.id = course_lessons.module_id AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE m.id = course_lessons.module_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "enrolled_view_modules"
ON public.course_modules FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.seller_accounts s ON s.id = c.seller_id
    WHERE c.id = course_modules.course_id AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = course_modules.course_id AND e.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.get_course_outline(_course_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(mod ORDER BY (mod->>'sort_order')::int), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', m.id,
      'title', m.title,
      'sort_order', m.sort_order,
      'course_lessons', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', l.id,
          'title', l.title,
          'duration_minutes', l.duration_minutes,
          'sort_order', l.sort_order
        ) ORDER BY l.sort_order)
        FROM public.course_lessons l
        WHERE l.module_id = m.id
      ), '[]'::jsonb)
    ) AS mod
    FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.course_id = _course_id AND c.published = true
  ) t;
$$;

REVOKE ALL ON FUNCTION public.get_course_outline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_outline(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_lesson_video(_lesson_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course_id uuid;
  _owner uuid;
  _video text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT c.id, s.user_id, l.video_url
  INTO _course_id, _owner, _video
  FROM public.course_lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  LEFT JOIN public.seller_accounts s ON s.id = c.seller_id
  WHERE l.id = _lesson_id;

  IF _course_id IS NULL THEN
    RAISE EXCEPTION 'Aula não encontrada';
  END IF;

  IF public.has_role(auth.uid(), 'admin')
     OR _owner = auth.uid()
     OR EXISTS (
       SELECT 1 FROM public.enrollments e
       WHERE e.course_id = _course_id AND e.user_id = auth.uid()
     )
  THEN
    RETURN _video;
  END IF;

  RAISE EXCEPTION 'Acesso negado';
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_video(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_video(uuid) TO authenticated;

DROP POLICY IF EXISTS "public_view_approved_sellers" ON public.seller_accounts;

CREATE OR REPLACE FUNCTION public.get_public_seller(_seller_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  bio text,
  avatar_url text,
  status seller_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.display_name, s.bio, s.avatar_url, s.status
  FROM public.seller_accounts s
  WHERE s.id = _seller_id AND s.status = 'approved';
$$;

REVOKE ALL ON FUNCTION public.get_public_seller(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_seller(uuid) TO anon, authenticated;