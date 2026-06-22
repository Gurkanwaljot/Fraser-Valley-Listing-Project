-- Phase 2: Expand audit_logs schema, add triggers, lock down table

-- 1. Add new columns to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_label text,
  ADD COLUMN IF NOT EXISTS entity_label text,
  ADD COLUMN IF NOT EXISTS changes jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- 2. Add indexes for the new query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 3. Make audit_logs append-only: deny UPDATE and DELETE for all API users
CREATE POLICY "Deny update on audit_logs"
  ON public.audit_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Deny delete on audit_logs"
  ON public.audit_logs FOR DELETE
  TO authenticated
  USING (false);

-- 4. Create a helper function to write audit entries (used by triggers and edge functions)
CREATE OR REPLACE FUNCTION private.write_audit_log(
  p_actor_user_id uuid,
  p_actor_label text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_entity_label text DEFAULT NULL,
  p_changes jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_user_id, actor_label, action, entity_type, entity_id, entity_label, changes, metadata)
  VALUES (p_actor_user_id, p_actor_label, p_action, p_entity_type, p_entity_id, p_entity_label, p_changes, p_metadata);
EXCEPTION WHEN OTHERS THEN
  -- Never block the triggering operation; log failure to pg_log
  RAISE WARNING 'write_audit_log failed: % %', SQLERRM, SQLSTATE;
END;
$$;

-- 5. Trigger function for listings
CREATE OR REPLACE FUNCTION private.audit_listings_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text;
  v_entity_label text;
  v_changes jsonb;
  v_actor uuid;
  v_actor_label text;
BEGIN
  v_actor := auth.uid();

  -- Resolve actor label
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_actor_label
  FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'INSERT' THEN
    v_action := 'listing_created';
    v_entity_label := COALESCE(NEW.street_address, NEW.title, 'Untitled');
    PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'listing', NEW.id, v_entity_label, NULL,
      jsonb_build_object('status', NEW.status));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'listing_status_changed';
      v_entity_label := COALESCE(NEW.street_address, NEW.title, 'Untitled');
      v_changes := jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
      PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'listing', NEW.id, v_entity_label, v_changes, '{}'::jsonb);
    END IF;

    -- Detect general field updates (excluding status which is handled above)
    v_changes := '{}'::jsonb;
    IF OLD.street_address IS DISTINCT FROM NEW.street_address THEN
      v_changes := v_changes || jsonb_build_object('street_address', jsonb_build_object('from', to_jsonb(OLD.street_address), 'to', to_jsonb(NEW.street_address)));
    END IF;
    IF OLD.city IS DISTINCT FROM NEW.city THEN
      v_changes := v_changes || jsonb_build_object('city', jsonb_build_object('from', to_jsonb(OLD.city), 'to', to_jsonb(NEW.city)));
    END IF;
    IF OLD.price IS DISTINCT FROM NEW.price THEN
      v_changes := v_changes || jsonb_build_object('price', jsonb_build_object('from', to_jsonb(OLD.price), 'to', to_jsonb(NEW.price)));
    END IF;
    IF OLD.bedrooms IS DISTINCT FROM NEW.bedrooms THEN
      v_changes := v_changes || jsonb_build_object('bedrooms', jsonb_build_object('from', to_jsonb(OLD.bedrooms), 'to', to_jsonb(NEW.bedrooms)));
    END IF;
    IF OLD.bathrooms IS DISTINCT FROM NEW.bathrooms THEN
      v_changes := v_changes || jsonb_build_object('bathrooms', jsonb_build_object('from', to_jsonb(OLD.bathrooms), 'to', to_jsonb(NEW.bathrooms)));
    END IF;
    IF OLD.square_footage IS DISTINCT FROM NEW.square_footage THEN
      v_changes := v_changes || jsonb_build_object('square_footage', jsonb_build_object('from', to_jsonb(OLD.square_footage), 'to', to_jsonb(NEW.square_footage)));
    END IF;
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('from', to_jsonb(OLD.title), 'to', to_jsonb(NEW.title)));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('from', 'changed', 'to', 'changed'));
    END IF;

    -- Only log listing_updated if there are actual field changes (and it wasn't just a status change)
    IF v_changes != '{}'::jsonb THEN
      v_entity_label := COALESCE(NEW.street_address, NEW.title, 'Untitled');
      PERFORM private.write_audit_log(v_actor, v_actor_label, 'listing_updated', 'listing', NEW.id, v_entity_label, v_changes, '{}'::jsonb);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'listing_deleted';
    v_entity_label := COALESCE(OLD.street_address, OLD.title, 'Untitled');
    PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'listing', OLD.id, v_entity_label, NULL,
      jsonb_build_object('status', OLD.status));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_listings
  AFTER INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.audit_listings_trigger();

-- 6. Trigger function for media_assets
CREATE OR REPLACE FUNCTION private.audit_media_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text;
  v_entity_label text;
  v_actor uuid;
  v_actor_label text;
  v_listing_label text;
BEGIN
  v_actor := auth.uid();
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_actor_label
  FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
    FROM public.listings WHERE id = NEW.listing_id;
    v_entity_label := COALESCE(NEW.file_name, 'media');
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'media_uploaded', 'media_asset', NEW.id, v_entity_label, NULL,
      jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label, 'media_type', NEW.media_type));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect hero change
    IF OLD.is_hero IS DISTINCT FROM NEW.is_hero AND NEW.is_hero = true THEN
      SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
      FROM public.listings WHERE id = NEW.listing_id;
      v_entity_label := COALESCE(NEW.file_name, 'media');
      PERFORM private.write_audit_log(v_actor, v_actor_label, 'media_hero_changed', 'media_asset', NEW.id, v_entity_label, NULL,
        jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label));
    END IF;

    -- Detect reorder
    IF OLD.sort_order IS DISTINCT FROM NEW.sort_order THEN
      -- We only log one entry per batch via a debounce approach: skip individual sort_order changes
      -- (reorder is handled as a batch in the app, each row fires separately - we'll log from client for reorder)
      NULL;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
    FROM public.listings WHERE id = OLD.listing_id;
    v_entity_label := COALESCE(OLD.file_name, 'media');
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'media_deleted', 'media_asset', OLD.id, v_entity_label, NULL,
      jsonb_build_object('listing_id', OLD.listing_id, 'listing_label', v_listing_label, 'media_type', OLD.media_type));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_media
  AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION private.audit_media_trigger();

-- 7. Trigger function for realtors
CREATE OR REPLACE FUNCTION private.audit_realtors_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text;
  v_entity_label text;
  v_changes jsonb;
  v_actor uuid;
  v_actor_label text;
BEGIN
  v_actor := auth.uid();
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_actor_label
  FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'INSERT' THEN
    v_entity_label := COALESCE(NEW.full_name, NEW.email, 'Unknown');
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_created', 'realtor', NEW.id, v_entity_label, NULL,
      jsonb_build_object('email', NEW.email, 'brokerage', NEW.brokerage));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect archive/unarchive
    IF OLD.archived IS DISTINCT FROM NEW.archived THEN
      IF NEW.archived = true THEN
        v_action := 'realtor_archived';
      ELSE
        v_action := 'realtor_unarchived';
      END IF;
      v_entity_label := COALESCE(NEW.full_name, NEW.email, 'Unknown');
      PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'realtor', NEW.id, v_entity_label, NULL, '{}'::jsonb);
    ELSE
      -- General update
      v_changes := '{}'::jsonb;
      IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
        v_changes := v_changes || jsonb_build_object('full_name', jsonb_build_object('from', to_jsonb(OLD.full_name), 'to', to_jsonb(NEW.full_name)));
      END IF;
      IF OLD.email IS DISTINCT FROM NEW.email THEN
        v_changes := v_changes || jsonb_build_object('email', jsonb_build_object('from', to_jsonb(OLD.email), 'to', to_jsonb(NEW.email)));
      END IF;
      IF OLD.phone IS DISTINCT FROM NEW.phone THEN
        v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('from', to_jsonb(OLD.phone), 'to', to_jsonb(NEW.phone)));
      END IF;
      IF OLD.brokerage IS DISTINCT FROM NEW.brokerage THEN
        v_changes := v_changes || jsonb_build_object('brokerage', jsonb_build_object('from', to_jsonb(OLD.brokerage), 'to', to_jsonb(NEW.brokerage)));
      END IF;

      IF v_changes != '{}'::jsonb THEN
        v_entity_label := COALESCE(NEW.full_name, NEW.email, 'Unknown');
        PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_updated', 'realtor', NEW.id, v_entity_label, v_changes, '{}'::jsonb);
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_entity_label := COALESCE(OLD.full_name, OLD.email, 'Unknown');
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_deleted', 'realtor', OLD.id, v_entity_label, NULL,
      jsonb_build_object('email', OLD.email));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_realtors
  AFTER INSERT OR UPDATE OR DELETE ON public.realtors
  FOR EACH ROW EXECUTE FUNCTION private.audit_realtors_trigger();

-- 8. Trigger function for listing_shares
CREATE OR REPLACE FUNCTION private.audit_shares_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity_label text;
  v_actor uuid;
  v_actor_label text;
  v_listing_label text;
BEGIN
  v_actor := auth.uid();
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_actor_label
  FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
    FROM public.listings WHERE id = NEW.listing_id;
    v_entity_label := v_listing_label;
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'share_created', 'listing_share', NEW.id, v_entity_label, NULL,
      jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label, 'realtor_id', NEW.realtor_id));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect revoke (revoked_at goes from null to a value)
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
      FROM public.listings WHERE id = NEW.listing_id;
      v_entity_label := v_listing_label;
      PERFORM private.write_audit_log(v_actor, v_actor_label, 'share_revoked', 'listing_share', NEW.id, v_entity_label, NULL,
        jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_shares
  AFTER INSERT OR UPDATE ON public.listing_shares
  FOR EACH ROW EXECUTE FUNCTION private.audit_shares_trigger();

-- 9. Trigger function for listing_realtors (assignments)
CREATE OR REPLACE FUNCTION private.audit_listing_realtors_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity_label text;
  v_actor uuid;
  v_actor_label text;
  v_listing_label text;
  v_realtor_label text;
BEGIN
  v_actor := auth.uid();
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_actor_label
  FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
    FROM public.listings WHERE id = NEW.listing_id;
    SELECT COALESCE(full_name, email, 'Unknown') INTO v_realtor_label
    FROM public.realtors WHERE id = NEW.realtor_id;
    v_entity_label := v_realtor_label || ' → ' || v_listing_label;
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_assigned', 'listing_realtor', NEW.listing_id, v_entity_label, NULL,
      jsonb_build_object('listing_id', NEW.listing_id, 'realtor_id', NEW.realtor_id, 'realtor_label', v_realtor_label, 'listing_label', v_listing_label));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
    FROM public.listings WHERE id = OLD.listing_id;
    SELECT COALESCE(full_name, email, 'Unknown') INTO v_realtor_label
    FROM public.realtors WHERE id = OLD.realtor_id;
    v_entity_label := v_realtor_label || ' → ' || v_listing_label;
    PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_unassigned', 'listing_realtor', OLD.listing_id, v_entity_label, NULL,
      jsonb_build_object('listing_id', OLD.listing_id, 'realtor_id', OLD.realtor_id, 'realtor_label', v_realtor_label, 'listing_label', v_listing_label));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_listing_realtors
  AFTER INSERT OR DELETE ON public.listing_realtors
  FOR EACH ROW EXECUTE FUNCTION private.audit_listing_realtors_trigger();

-- 10. Trigger function for leads
CREATE OR REPLACE FUNCTION private.audit_leads_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity_label text;
  v_listing_label text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(street_address, title, 'Untitled') INTO v_listing_label
    FROM public.listings WHERE id = NEW.listing_id;
    v_entity_label := COALESCE(NEW.name, NEW.email, 'Anonymous') || ' for ' || v_listing_label;
    -- Leads are created by anonymous visitors, so actor is null
    PERFORM private.write_audit_log(NULL, NULL, 'lead_created', 'lead', NEW.id, v_entity_label, NULL,
      jsonb_build_object('listing_id', NEW.listing_id, 'email', NEW.email, 'listing_label', v_listing_label));
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_leads
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION private.audit_leads_trigger();

-- 11. Backfill actor_label for existing audit rows where possible
UPDATE public.audit_logs al
SET actor_label = COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE al.actor_user_id = u.id AND al.actor_label IS NULL;

-- 12. Backfill entity_label for existing invitation audit entries
UPDATE public.audit_logs
SET entity_label = metadata->>'email'
WHERE entity_type = 'invitation' AND entity_label IS NULL AND metadata->>'email' IS NOT NULL;

-- 13. Create an RPC to get audit logs with proper filtering (admin only)
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
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
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

-- 14. RPC to get distinct actions (for dynamic filter dropdown)
CREATE OR REPLACE FUNCTION public.get_audit_actions()
RETURNS TABLE(action text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT al.action, count(*)::bigint
  FROM public.audit_logs al
  GROUP BY al.action
  ORDER BY count(*) DESC;
END;
$$;
