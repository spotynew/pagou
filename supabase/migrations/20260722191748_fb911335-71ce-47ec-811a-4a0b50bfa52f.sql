
CREATE OR REPLACE FUNCTION public.verify_ticket_public(_code text)
RETURNS TABLE(
  ticket_id uuid,
  code_suffix text,
  status text,
  sector text,
  batch_name text,
  event_title text,
  event_starts_at timestamptz,
  event_venue text,
  checked_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    right(t.code, 6),
    t.status::text,
    t.sector,
    t.batch_name,
    e.title,
    e.starts_at,
    e.venue,
    (SELECT c.checked_at FROM public.checkins c WHERE c.ticket_id = t.id LIMIT 1)
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  WHERE upper(t.code) = upper(trim(_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_ticket_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_ticket_public(text) TO anon, authenticated;
