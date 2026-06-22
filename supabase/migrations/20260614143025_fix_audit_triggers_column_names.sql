-- Fix audit triggers: replace street_address with address_line_1, file_name with filename_original, media_type with kind

-- 1. Fix audit_listings_trigger
CREATE OR REPLACE FUNCTION private.audit_listings_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
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
v_action := 'listing_created';
v_entity_label := COALESCE(NEW.address_line_1, NEW.title, 'Untitled');
PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'listing', NEW.id, v_entity_label, NULL,
jsonb_build_object('status', NEW.status));
RETURN NEW;

ELSIF TG_OP = 'UPDATE' THEN
-- Detect status change
IF OLD.status IS DISTINCT FROM NEW.status THEN
v_action := 'listing_status_changed';
v_entity_label := COALESCE(NEW.address_line_1, NEW.title, 'Untitled');
v_changes := jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'listing', NEW.id, v_entity_label, v_changes, '{}'::jsonb);
END IF;

-- Detect general field updates
v_changes := '{}'::jsonb;
IF OLD.address_line_1 IS DISTINCT FROM NEW.address_line_1 THEN
v_changes := v_changes || jsonb_build_object('address_line_1', jsonb_build_object('from', to_jsonb(OLD.address_line_1), 'to', to_jsonb(NEW.address_line_1)));
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

IF v_changes != '{}'::jsonb THEN
v_entity_label := COALESCE(NEW.address_line_1, NEW.title, 'Untitled');
PERFORM private.write_audit_log(v_actor, v_actor_label, 'listing_updated', 'listing', NEW.id, v_entity_label, v_changes, '{}'::jsonb);
END IF;

RETURN NEW;

ELSIF TG_OP = 'DELETE' THEN
v_action := 'listing_deleted';
v_entity_label := COALESCE(OLD.address_line_1, OLD.title, 'Untitled');
PERFORM private.write_audit_log(v_actor, v_actor_label, v_action, 'listing', OLD.id, v_entity_label, NULL,
jsonb_build_object('status', OLD.status));
RETURN OLD;
END IF;

RETURN NULL;
END;
$$;

-- 2. Fix audit_media_trigger
CREATE OR REPLACE FUNCTION private.audit_media_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
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
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = NEW.listing_id;
v_entity_label := COALESCE(NEW.filename_original, 'media');
PERFORM private.write_audit_log(v_actor, v_actor_label, 'media_uploaded', 'media_asset', NEW.id, v_entity_label, NULL,
jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label, 'kind', NEW.kind));
RETURN NEW;

ELSIF TG_OP = 'UPDATE' THEN
IF OLD.is_hero IS DISTINCT FROM NEW.is_hero AND NEW.is_hero = true THEN
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = NEW.listing_id;
v_entity_label := COALESCE(NEW.filename_original, 'media');
PERFORM private.write_audit_log(v_actor, v_actor_label, 'media_hero_changed', 'media_asset', NEW.id, v_entity_label, NULL,
jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label));
END IF;
RETURN NEW;

ELSIF TG_OP = 'DELETE' THEN
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = OLD.listing_id;
v_entity_label := COALESCE(OLD.filename_original, 'media');
PERFORM private.write_audit_log(v_actor, v_actor_label, 'media_deleted', 'media_asset', OLD.id, v_entity_label, NULL,
jsonb_build_object('listing_id', OLD.listing_id, 'listing_label', v_listing_label, 'kind', OLD.kind));
RETURN OLD;
END IF;

RETURN NULL;
END;
$$;

-- 3. Fix audit_shares_trigger
CREATE OR REPLACE FUNCTION private.audit_shares_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
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
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = NEW.listing_id;
v_entity_label := v_listing_label;
PERFORM private.write_audit_log(v_actor, v_actor_label, 'share_created', 'listing_share', NEW.id, v_entity_label, NULL,
jsonb_build_object('listing_id', NEW.listing_id, 'listing_label', v_listing_label, 'realtor_id', NEW.realtor_id));
RETURN NEW;

ELSIF TG_OP = 'UPDATE' THEN
IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
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

-- 4. Fix audit_listing_realtors_trigger
CREATE OR REPLACE FUNCTION private.audit_listing_realtors_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
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
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = NEW.listing_id;
SELECT COALESCE(full_name, email, 'Unknown') INTO v_realtor_label
FROM public.realtors WHERE id = NEW.realtor_id;
v_entity_label := v_realtor_label || ' -> ' || v_listing_label;
PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_assigned', 'listing_realtor', NEW.listing_id, v_entity_label, NULL,
jsonb_build_object('listing_id', NEW.listing_id, 'realtor_id', NEW.realtor_id, 'realtor_label', v_realtor_label, 'listing_label', v_listing_label));
RETURN NEW;

ELSIF TG_OP = 'DELETE' THEN
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = OLD.listing_id;
SELECT COALESCE(full_name, email, 'Unknown') INTO v_realtor_label
FROM public.realtors WHERE id = OLD.realtor_id;
v_entity_label := v_realtor_label || ' -> ' || v_listing_label;
PERFORM private.write_audit_log(v_actor, v_actor_label, 'realtor_unassigned', 'listing_realtor', OLD.listing_id, v_entity_label, NULL,
jsonb_build_object('listing_id', OLD.listing_id, 'realtor_id', OLD.realtor_id, 'realtor_label', v_realtor_label, 'listing_label', v_listing_label));
RETURN OLD;
END IF;

RETURN NULL;
END;
$$;

-- 5. Fix audit_leads_trigger
CREATE OR REPLACE FUNCTION private.audit_leads_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
v_entity_label text;
v_listing_label text;
BEGIN
IF TG_OP = 'INSERT' THEN
SELECT COALESCE(address_line_1, title, 'Untitled') INTO v_listing_label
FROM public.listings WHERE id = NEW.listing_id;
v_entity_label := COALESCE(NEW.name, NEW.email, 'Anonymous') || ' for ' || v_listing_label;
PERFORM private.write_audit_log(NULL, NULL, 'lead_created', 'lead', NEW.id, v_entity_label, NULL,
jsonb_build_object('listing_id', NEW.listing_id, 'email', NEW.email, 'listing_label', v_listing_label));
RETURN NEW;
END IF;

RETURN NULL;
END;
$$;
