CREATE OR REPLACE FUNCTION public.security_overview()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'vendedor') OR public.has_role(auth.uid(),'analista')) THEN RAISE EXCEPTION 'Acceso restringido'; END IF;
 RETURN jsonb_build_object(
  'checked_at',now(),
  'configured_pins',(SELECT count(*) FROM public.transaction_pins),
  'locked_pins',(SELECT count(*) FROM public.transaction_pins WHERE locked_until>now()),
  'failed_24h',(SELECT count(*) FROM public.security_events WHERE event_type IN ('pin_failed','pin_locked') AND created_at>now()-interval '24 hours'),
  'cancelled_24h',(SELECT count(*) FROM public.orders WHERE status='cancelado' AND created_at>now()-interval '24 hours'),
  'stale_pending',(SELECT count(*) FROM public.orders WHERE status='pendiente' AND created_at<now()-interval '48 hours'),
  'out_of_stock',(SELECT count(*) FROM public.products WHERE active AND stock<=0),
  'low_stock',(SELECT count(*) FROM public.products WHERE active AND stock BETWEEN 1 AND 3),
  'customers_without_pin',(SELECT count(*) FROM public.user_roles r WHERE r.role='cliente' AND NOT EXISTS (SELECT 1 FROM public.transaction_pins p WHERE p.user_id=r.user_id))
 );
END $function$;

CREATE POLICY analyst_security_events ON public.security_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'analista'));