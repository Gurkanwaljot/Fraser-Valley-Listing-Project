-- Allow any photographer to delete any realtor (shared pool)
DROP POLICY IF EXISTS "Photographers can delete own realtors" ON public.realtors;

CREATE POLICY "Photographers can delete realtors"
  ON public.realtors FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'photographer'));
