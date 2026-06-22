-- Fix audit_realtors_trigger: references non-existent "archived" column instead of "is_archived"
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
IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
IF NEW.is_archived = true THEN
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
