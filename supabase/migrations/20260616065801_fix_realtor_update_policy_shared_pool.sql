-- Allow any photographer to update any realtor (shared pool)
DROP POLICY IF EXISTS "Photographers can update own realtors" ON public.realtors;

CREATE POLICY "Photographers can update realtors"
  ON public.realtors FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'photographer'))
  WITH CHECK (private.has_role(auth.uid(), 'photographer'));
