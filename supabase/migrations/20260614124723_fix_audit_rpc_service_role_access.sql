-- Fix: Allow service_role to bypass admin check (auth.uid() is null for service_role)
-- Also fix for authenticated admin users

CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_action_filter text DEFAULT NULL,
  p_actor_filter uuid DEFAULT NULL,
  p_entity_type_filter text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  actor_user_id uuid,
  actor_label text,
  action text,
  entity_type text,
  entity_id uuid,
  entity_label text,
  changes jsonb,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  -- Check JWT role claim: service_role bypasses, authenticated must be admin
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF v_role != 'service_role' THEN
    IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT al.*
    FROM public.audit_logs al
    WHERE (p_action_filter IS NULL OR al.action = p_action_filter)
      AND (p_actor_filter IS NULL OR al.actor_user_id = p_actor_filter)
      AND (p_entity_type_filter IS NULL OR al.entity_type = p_entity_type_filter)
      AND (p_date_from IS NULL OR al.created_at >= p_date_from)
      AND (p_date_to IS NULL OR al.created_at <= p_date_to)
      AND (p_search IS NULL OR
           al.entity_label ILIKE '%' || p_search || '%' OR
           al.actor_label ILIKE '%' || p_search || '%' OR
           al.action ILIKE '%' || p_search || '%')
  )
  SELECT
    f.id,
    f.actor_user_id,
    f.actor_label,
    f.action,
    f.entity_type,
    f.entity_id,
    f.entity_label,
    f.changes,
    f.metadata,
    f.created_at,
    (SELECT count(*) FROM filtered)::bigint AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_audit_actions()
RETURNS TABLE(action text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF v_role != 'service_role' THEN
    IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  RETURN QUERY
  SELECT al.action, count(*)::bigint
  FROM public.audit_logs al
  GROUP BY al.action
  ORDER BY count(*) DESC;
END;
$$;
