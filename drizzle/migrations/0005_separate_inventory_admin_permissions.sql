DROP POLICY IF EXISTS "public read active" ON public.products;
DROP POLICY IF EXISTS "seller insert" ON public.products;
DROP POLICY IF EXISTS "seller update" ON public.products;
DROP POLICY IF EXISTS "seller delete" ON public.products;

CREATE POLICY "public and staff read products"
ON public.products FOR SELECT
TO anon, authenticated
USING (active OR public.has_role(auth.uid(), 'vendedor') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "administrator insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "administrator update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));