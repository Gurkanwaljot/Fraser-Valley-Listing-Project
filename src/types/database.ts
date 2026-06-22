export type UserRole = 'admin' | 'photographer' | 'realtor';
export type ListingStatus = 'draft' | 'active' | 'pending' | 'sold' | 'archived';
export type MediaKind = 'photo' | 'video' | 'document' | 'floor_plan';
export type DownloadCategory = MediaKind | 'all';
export type DownloadType = 'single' | 'bulk_zip' | 'web_versions' | 'originals';
export type EventType =
  | 'view' | 'photo_open' | 'video_play' | 'document_download'
  | 'realtor_contact_click' | 'lead_submit' | 'download_center_open' | 'asset_download'
  | 'page_leave' | 'scroll_depth' | 'gallery_summary'
  | 'otp_requested' | 'otp_verified' | 'otp_failed' | 'asset_download_complete'
  | 'marketing_kit_open' | 'brochure_open' | 'brochure_export'
  | 'social_post_open' | 'social_post_export' | 'reel_open' | 'reel_export'
  | 'realtor_portal_view';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
  bio: string | null;
  website_url: string | null;
  is_suspended: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Realtor {
  id: string;
  created_by: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  brokerage: string | null;
  brokerage_logo_url: string | null;
  headshot_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  photographer_id: string;
  title: string;
  slug: string;
  status: ListingStatus;
  property_type: string | null;
  description: string | null;
  price: number | null;
  property_taxes: number | null;
  currency: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  province_state: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  lot_size: string | null;
  year_built: number | null;
  mls_number: string | null;
  features: string[];
  hero_media_id: string | null;
  section_order: string[] | null;
  hidden_sections: string[] | null;
  interactive_floor_plan_embed: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingRealtor {
  id: string;
  listing_id: string;
  realtor_id: string;
  assigned_by: string;
  is_primary: boolean;
  notifications_enabled: boolean;
  can_download: boolean;
  can_view_analytics: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  listing_id: string;
  uploaded_by: string;
  kind: MediaKind;
  storage_provider: string;
  bucket: string | null;
  original_key: string;
  original_url: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
  poster_url: string | null;
  large_url: string | null;
  filename_original: string;
  file_size_bytes: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  variants: MediaVariant[];
  blurhash: string | null;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  is_hero: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaVariant {
  width: number;
  height: number;
  url: string;
  format: string;
  size_bytes: number;
}

export interface ListingShare {
  id: string;
  listing_id: string;
  realtor_id: string;
  shared_by: string;
  share_token: string;
  expires_at: string | null;
  accessed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingEvent {
  id: string;
  listing_id: string;
  event_type: EventType;
  session_id: string | null;
  user_id: string | null;
  realtor_id: string | null;
  metadata: Record<string, unknown>;
  referrer: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
}

export interface DownloadLog {
  id: string;
  listing_id: string;
  realtor_id: string | null;
  user_id: string | null;
  media_asset_id: string | null;
  download_type: DownloadType;
  asset_ids: string[] | null;
  file_count: number | null;
  total_size_bytes: number | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  listing_id: string;
  realtor_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
  notified_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_label: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditActionCount {
  action: string;
  count: number;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface UserInvitation {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  invited_by: string | null;
  status: InvitationStatus;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      user_roles: { Row: UserRoleRecord; Insert: Omit<UserRoleRecord, 'id' | 'created_at'>; Update: Partial<UserRoleRecord> };
      realtors: { Row: Realtor; Insert: Partial<Realtor> & { created_by: string; full_name: string; email: string }; Update: Partial<Realtor> };
      listings: { Row: Listing; Insert: Partial<Listing> & { photographer_id: string; title: string; slug: string }; Update: Partial<Listing> };
      listing_realtors: { Row: ListingRealtor; Insert: Partial<ListingRealtor> & { listing_id: string; realtor_id: string; assigned_by: string }; Update: Partial<ListingRealtor> };
      media_assets: { Row: MediaAsset; Insert: Partial<MediaAsset> & { listing_id: string; uploaded_by: string; kind: MediaKind; original_key: string; filename_original: string }; Update: Partial<MediaAsset> };
      listing_shares: { Row: ListingShare; Insert: Partial<ListingShare> & { listing_id: string; realtor_id: string; shared_by: string; share_token: string }; Update: Partial<ListingShare> };
      listing_events: { Row: ListingEvent; Insert: Partial<ListingEvent> & { listing_id: string; event_type: EventType }; Update: Partial<ListingEvent> };
      download_logs: { Row: DownloadLog; Insert: Partial<DownloadLog> & { listing_id: string; download_type: DownloadType }; Update: Partial<DownloadLog> };
      leads: { Row: Lead; Insert: Partial<Lead> & { listing_id: string; name: string }; Update: Partial<Lead> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog> & { action: string; entity_type: string }; Update: Partial<AuditLog> };
    };
  };
}
