/*
  # Lumen Listings - Core Database Schema

  1. New Tables
    - `profiles` - User profile data linked to auth.users
      - `id` (uuid, PK, FK to auth.users)
      - `full_name`, `email`, `phone`, `avatar_url`, `company_name`, `bio`, `website_url`
      - `created_at`, `updated_at`
    - `user_roles` - Role assignments for users
      - `id` (uuid, PK)
      - `user_id` (uuid, FK to auth.users)
      - `role` (text: admin, photographer, realtor)
      - Unique constraint on (user_id, role)
    - `realtors` - Realtor business profiles created by photographers
      - `id` (uuid, PK)
      - `created_by` (uuid, FK to auth.users)
      - `auth_user_id` (uuid, nullable FK to auth.users)
      - Contact and business info fields
    - `listings` - Property listings
      - `id` (uuid, PK)
      - `photographer_id` (uuid, FK to auth.users)
      - Property details, location, features, status
    - `listing_realtors` - Junction table for listing-realtor assignments
      - Links listings to realtors with permissions
    - `media_assets` - Photos, videos, documents for listings
      - Storage provider, URLs, metadata, variants
    - `listing_shares` - Share tokens for realtor access
    - `listing_events` - Analytics events (views, clicks, etc.)
    - `download_logs` - Track all downloads
    - `leads` - Contact form submissions
    - `audit_logs` - System audit trail

  2. Security
    - RLS enabled on all tables (policies in separate migration)

  3. Functions
    - `has_role(user_id uuid, role text)` - Check user role
    - `handle_new_user()` - Auto-create profile on signup

  4. Notes
    - All tables use gen_random_uuid() for primary keys
    - Timestamps use timestamptz with defaults
    - JSONB fields for flexible data (features, variants, metadata)
*/

-- Function to check user role (security definer for RLS usage)
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = check_role
  );
END;
$$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  company_name text,
  bio text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'photographer', 'realtor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Realtors table
CREATE TABLE IF NOT EXISTS public.realtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  auth_user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  brokerage text,
  headshot_url text,
  bio text,
  instagram_url text,
  linkedin_url text,
  website_url text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.realtors ENABLE ROW LEVEL SECURITY;

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'archived')),
  property_type text,
  description text,
  price numeric,
  currency text NOT NULL DEFAULT 'CAD',
  address_line_1 text NOT NULL DEFAULT '',
  address_line_2 text,
  city text NOT NULL DEFAULT '',
  province_state text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Canada',
  latitude numeric,
  longitude numeric,
  bedrooms numeric,
  bathrooms numeric,
  square_footage numeric,
  lot_size text,
  year_built integer,
  mls_number text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  hero_media_id uuid,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Listing-Realtor junction table
CREATE TABLE IF NOT EXISTS public.listing_realtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  realtor_id uuid NOT NULL REFERENCES public.realtors(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  is_primary boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT true,
  can_download boolean NOT NULL DEFAULT true,
  can_view_analytics boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, realtor_id)
);
ALTER TABLE public.listing_realtors ENABLE ROW LEVEL SECURITY;

-- Media assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL CHECK (kind IN ('photo', 'video', 'document')),
  storage_provider text NOT NULL DEFAULT 'cloudflare_r2',
  bucket text,
  original_key text NOT NULL,
  original_url text,
  public_url text,
  thumbnail_url text,
  poster_url text,
  filename_original text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  width integer,
  height integer,
  duration_seconds numeric,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  blurhash text,
  alt_text text,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  is_hero boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Add FK for hero_media_id after media_assets exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'listings_hero_media_id_fkey'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_hero_media_id_fkey
      FOREIGN KEY (hero_media_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Listing shares table
CREATE TABLE IF NOT EXISTS public.listing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  realtor_id uuid NOT NULL REFERENCES public.realtors(id),
  shared_by uuid NOT NULL REFERENCES auth.users(id),
  share_token text UNIQUE NOT NULL,
  expires_at timestamptz,
  accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_shares ENABLE ROW LEVEL SECURITY;

-- Listing events (analytics)
CREATE TABLE IF NOT EXISTS public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'view', 'photo_open', 'video_play', 'document_download',
    'realtor_contact_click', 'lead_submit', 'download_center_open', 'asset_download'
  )),
  session_id text,
  user_id uuid REFERENCES auth.users(id),
  realtor_id uuid REFERENCES public.realtors(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  referrer text,
  device_type text,
  country text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

-- Download logs
CREATE TABLE IF NOT EXISTS public.download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  realtor_id uuid REFERENCES public.realtors(id),
  user_id uuid REFERENCES auth.users(id),
  media_asset_id uuid REFERENCES public.media_assets(id),
  download_type text NOT NULL CHECK (download_type IN ('single', 'bulk_zip', 'web_versions', 'originals')),
  asset_ids jsonb,
  file_count integer,
  total_size_bytes bigint,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- Leads (contact form submissions)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  realtor_id uuid REFERENCES public.realtors(id),
  name text NOT NULL,
  email text,
  phone text,
  message text,
  source text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_realtors_created_by ON public.realtors(created_by);
CREATE INDEX IF NOT EXISTS idx_realtors_email ON public.realtors(email);
CREATE INDEX IF NOT EXISTS idx_listings_photographer_id ON public.listings(photographer_id);
CREATE INDEX IF NOT EXISTS idx_listings_slug ON public.listings(slug);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listing_realtors_listing_id ON public.listing_realtors(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_realtors_realtor_id ON public.listing_realtors(realtor_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_id ON public.media_assets(listing_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_kind ON public.media_assets(kind);
CREATE INDEX IF NOT EXISTS idx_listing_shares_token ON public.listing_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_listing_shares_realtor_id ON public.listing_shares(realtor_id);
CREATE INDEX IF NOT EXISTS idx_listing_events_listing_id ON public.listing_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_events_event_type ON public.listing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_listing_events_created_at ON public.listing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_download_logs_listing_id ON public.download_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON public.leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_realtors_updated_at ON public.realtors;
CREATE TRIGGER set_realtors_updated_at
  BEFORE UPDATE ON public.realtors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_listings_updated_at ON public.listings;
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_listing_realtors_updated_at ON public.listing_realtors;
CREATE TRIGGER set_listing_realtors_updated_at
  BEFORE UPDATE ON public.listing_realtors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER set_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_listing_shares_updated_at ON public.listing_shares;
CREATE TRIGGER set_listing_shares_updated_at
  BEFORE UPDATE ON public.listing_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
