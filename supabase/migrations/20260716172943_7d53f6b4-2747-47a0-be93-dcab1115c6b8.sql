
REVOKE ALL ON FUNCTION public.available_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_reservations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_payment_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
