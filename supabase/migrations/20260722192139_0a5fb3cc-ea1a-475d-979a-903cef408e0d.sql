REVOKE ALL ON FUNCTION public.verify_ticket_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_ticket_public(text) TO anon, authenticated;