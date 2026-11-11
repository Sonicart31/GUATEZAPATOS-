CREATE TABLE public.transaction_pins (user_id uuid PRIMARY KEY, pin_hash text NOT NULL, failed_attempts integer NOT NULL DEFAULT 0, locked_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.transaction_pins TO service_role;
ALTER TABLE public.transaction_pins ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.security_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, event_type text NOT NULL, severity text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_security_events ON public.security_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'vendedor'));
CREATE INDEX security_events_created_idx ON public.security_events(created_at DESC);
CREATE FUNCTION public.check_transaction_pin(_pin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.transaction_pins; attempts integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
 SELECT * INTO p FROM public.transaction_pins WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Crea tu PIN personal en Mi PIN antes de continuar.'); END IF;
 IF p.locked_until > now() THEN RETURN jsonb_build_object('ok',false,'message','PIN bloqueado temporalmente. Espera 15 minutos desde el bloqueo.'); END IF;
 IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' OR extensions.crypt(_pin,p.pin_hash) IS DISTINCT FROM p.pin_hash THEN
  attempts := CASE WHEN p.locked_until IS NOT NULL THEN 1 ELSE p.failed_attempts+1 END;
  UPDATE public.transaction_pins SET failed_attempts=attempts, locked_until=CASE WHEN attempts>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=auth.uid();
  INSERT INTO public.security_events(user_id,event_type,severity) VALUES(auth.uid(),CASE WHEN attempts>=5 THEN 'pin_locked' ELSE 'pin_failed' END,CASE WHEN attempts>=5 THEN 'alto' ELSE 'medio' END);
  RETURN jsonb_build_object('ok',false,'message',CASE WHEN attempts>=5 THEN 'PIN bloqueado por 15 minutos tras 5 intentos incorrectos.' ELSE 'PIN incorrecto. Intentos restantes: '||(5-attempts)::text END);
 END IF;
 UPDATE public.transaction_pins SET failed_attempts=0,locked_until=NULL WHERE user_id=auth.uid();
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.check_transaction_pin(text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.transaction_pin_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
 RETURN jsonb_build_object('configured',EXISTS(SELECT 1 FROM public.transaction_pins WHERE user_id=auth.uid()));
END $$;
REVOKE ALL ON FUNCTION public.transaction_pin_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transaction_pin_status() TO authenticated;
CREATE FUNCTION public.set_transaction_pin(_pin text,_current_pin text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN RETURN jsonb_build_object('ok',false,'message','El PIN debe tener 6 dígitos.'); END IF;
 IF EXISTS(SELECT 1 FROM public.transaction_pins WHERE user_id=auth.uid()) THEN
  result:=public.check_transaction_pin(_current_pin);
  IF NOT (result->>'ok')::boolean THEN RETURN result; END IF;
 END IF;
 INSERT INTO public.transaction_pins(user_id,pin_hash) VALUES(auth.uid(),extensions.crypt(_pin,extensions.gen_salt('bf',10))) ON CONFLICT(user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,failed_attempts=0,locked_until=NULL,updated_at=now();
 INSERT INTO public.security_events(user_id,event_type,severity) VALUES(auth.uid(),'pin_changed','bajo');
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.set_transaction_pin(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_transaction_pin(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.place_order(_items jsonb,_address text,_phone text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Confirma la compra con tu PIN personal.'; END $$;
COMMENT ON FUNCTION public.place_order(jsonb,text,text) IS 'DEPRECATED: replaced by place_order_with_pin; refuses purchases without a transaction PIN.';
CREATE FUNCTION public.place_order_with_pin(_items jsonb,_address text,_phone text,_pin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; _order uuid; _it jsonb; _p public.products; _total numeric:=0;
BEGIN
 result:=public.check_transaction_pin(_pin);
 IF NOT (result->>'ok')::boolean THEN RETURN result; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items)=0 OR jsonb_array_length(_items)>100 THEN RAISE EXCEPTION 'Carrito no válido'; END IF;
 IF coalesce(length(trim(_address)),0)=0 OR length(_address)>500 OR coalesce(length(trim(_phone)),0)=0 OR length(_phone)>30 THEN RAISE EXCEPTION 'Revisa dirección y teléfono'; END IF;
 INSERT INTO public.orders(customer_id,address,phone) VALUES(auth.uid(),_address,_phone) RETURNING id INTO _order;
 FOR _it IN SELECT * FROM jsonb_array_elements(_items) ORDER BY value->>'product_id' LOOP
 SELECT * INTO _p FROM public.products WHERE id=(_it->>'product_id')::uuid AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
 IF (_it->>'quantity') IS NULL OR (_it->>'quantity')::int<1 OR _p.stock<(_it->>'quantity')::int THEN RAISE EXCEPTION 'Sin stock suficiente'; END IF;
 IF NOT (coalesce(_it->>'size','')=ANY(string_to_array(replace(_p.sizes,' ',''),','))) THEN RAISE EXCEPTION 'Talla no disponible'; END IF;
 UPDATE public.products SET stock=stock-(_it->>'quantity')::int WHERE id=_p.id;
 INSERT INTO public.order_items(order_id,product_id,product_name,size,quantity,unit_price) VALUES(_order,_p.id,_p.name,_it->>'size',(_it->>'quantity')::int,_p.price);
 _total:=_total+_p.price*(_it->>'quantity')::int;
 END LOOP;
 UPDATE public.orders SET total=_total WHERE id=_order;
 INSERT INTO public.security_events(user_id,event_type,severity) VALUES(auth.uid(),'purchase_confirmed','bajo');
 RETURN jsonb_build_object('ok',true,'order_id',_order);
END $$;
REVOKE ALL ON FUNCTION public.place_order_with_pin(jsonb,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_order_with_pin(jsonb,text,text,text) TO authenticated;
CREATE FUNCTION public.cancel_order_with_pin(_order_id uuid,_pin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; o public.orders; item record;
BEGIN
 result:=public.check_transaction_pin(_pin);
 IF NOT (result->>'ok')::boolean THEN RETURN result; END IF;
 SELECT * INTO o FROM public.orders WHERE id=_order_id AND customer_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Pedido no disponible.'); END IF;
 IF o.status NOT IN ('pendiente','confirmado') THEN RETURN jsonb_build_object('ok',false,'message','Solo puedes cancelar antes del envío.'); END IF;
 FOR item IN SELECT product_id,sum(quantity) AS quantity FROM public.order_items WHERE order_id=o.id AND product_id IS NOT NULL GROUP BY product_id ORDER BY product_id LOOP
 UPDATE public.products SET stock=stock+item.quantity WHERE id=item.product_id;
 END LOOP;
 UPDATE public.orders SET status='cancelado' WHERE id=o.id;
 INSERT INTO public.security_events(user_id,event_type,severity) VALUES(auth.uid(),'order_cancelled','bajo');
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.cancel_order_with_pin(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_pin(uuid,text) TO authenticated;
CREATE FUNCTION public.security_overview() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'vendedor') THEN RAISE EXCEPTION 'Acceso restringido'; END IF;
 RETURN jsonb_build_object('checked_at',now(),'configured_pins',(SELECT count(*) FROM public.transaction_pins),'locked_pins',(SELECT count(*) FROM public.transaction_pins WHERE locked_until>now()),'failed_24h',(SELECT count(*) FROM public.security_events WHERE event_type IN ('pin_failed','pin_locked') AND created_at>now()-interval '24 hours'));
END $$;
REVOKE ALL ON FUNCTION public.security_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.security_overview() TO authenticated;