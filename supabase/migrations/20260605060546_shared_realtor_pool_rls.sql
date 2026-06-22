-- Make realtors a shared pool: all photographers/admins can SELECT all realtors
-- Keep UPDATE/DELETE restricted to creator or admin

-- Drop the old per-photographer SELECT policy
DROP POLICY IF EXISTS "Photographers can view own realtors" ON public.realtors;

-- Create new shared SELECT policy for all authenticated users with photographer or admin role
CREATE POLICY "Photographers can view all realtors"
  ON public.realtors FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'photographer') OR private.has_role(auth.uid(), 'admin')
  );
