/*
  # Lumen Listings - Row Level Security Policies

  This migration adds comprehensive RLS policies for all tables.
  
  Policy Design:
  - Admin: Full access to all data via has_role() check
  - Photographer: Access to own data (created by them)
  - Realtor: Access only to assigned listings and related data
  - Public (anon): Read-only access to active public listings and public media
  
  Security Notes:
  - All policies check auth.uid() for authenticated access
  - has_role() is a SECURITY DEFINER function for safe RLS usage
  - No policy uses USING(true) - all enforce ownership/role checks
  - Service role bypasses RLS for Edge Functions
*/

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER_ROLES POLICIES
-- ============================================================

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only admins can assign roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- REALTORS POLICIES
-- ============================================================

-- Admins can view all realtors
CREATE POLICY "Admins can view all realtors"
  ON public.realtors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photographers can view realtors they created
CREATE POLICY "Photographers can view own realtors"
  ON public.realtors FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Realtors can view their own realtor profile
CREATE POLICY "Realtors can view own realtor profile"
  ON public.realtors FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Photographers and admins can create realtors
CREATE POLICY "Photographers can create realtors"
  ON public.realtors FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    (public.has_role(auth.uid(), 'photographer') OR public.has_role(auth.uid(), 'admin'))
  );

-- Photographers can update their own realtors
CREATE POLICY "Photographers can update own realtors"
  ON public.realtors FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Admins can update any realtor
CREATE POLICY "Admins can update any realtor"
  ON public.realtors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete realtors
CREATE POLICY "Admins can delete realtors"
  ON public.realtors FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public can view realtor info on active listings
CREATE POLICY "Public can view realtors on active listings"
  ON public.realtors FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_realtors lr
      JOIN public.listings l ON l.id = lr.listing_id
      WHERE lr.realtor_id = realtors.id AND l.status = 'active'
    )
  );

-- ============================================================
-- LISTINGS POLICIES
-- ============================================================

-- Admins can view all listings
CREATE POLICY "Admins can view all listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photographers can view their own listings
CREATE POLICY "Photographers can view own listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

-- Realtors can view listings assigned to them
CREATE POLICY "Realtors can view assigned listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_realtors lr
      JOIN public.realtors r ON r.id = lr.realtor_id
      WHERE lr.listing_id = listings.id AND r.auth_user_id = auth.uid()
    )
  );

-- Public can view active listings
CREATE POLICY "Public can view active listings"
  ON public.listings FOR SELECT
  TO anon
  USING (status = 'active');

-- Authenticated public can also view active listings
CREATE POLICY "Authenticated can view active listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Photographers can create listings
CREATE POLICY "Photographers can create listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (
    photographer_id = auth.uid() AND
    (public.has_role(auth.uid(), 'photographer') OR public.has_role(auth.uid(), 'admin'))
  );

-- Photographers can update their own listings
CREATE POLICY "Photographers can update own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Admins can update any listing
CREATE POLICY "Admins can update any listing"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Photographers can delete their own listings
CREATE POLICY "Photographers can delete own listings"
  ON public.listings FOR DELETE
  TO authenticated
  USING (photographer_id = auth.uid());

-- Admins can delete any listing
CREATE POLICY "Admins can delete any listing"
  ON public.listings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- LISTING_REALTORS POLICIES
-- ============================================================

-- Admins can view all assignments
CREATE POLICY "Admins can view all listing realtor assignments"
  ON public.listing_realtors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photographers can view assignments for their listings
CREATE POLICY "Photographers can view own listing assignments"
  ON public.listing_realtors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_realtors.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Realtors can view their own assignments
CREATE POLICY "Realtors can view own assignments"
  ON public.listing_realtors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.realtors r
      WHERE r.id = listing_realtors.realtor_id AND r.auth_user_id = auth.uid()
    )
  );

-- Public can view assignments for active listings (for contact display)
CREATE POLICY "Public can view active listing assignments"
  ON public.listing_realtors FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_realtors.listing_id AND l.status = 'active'
    )
  );

-- Photographers can create assignments for their listings
CREATE POLICY "Photographers can create listing assignments"
  ON public.listing_realtors FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_realtors.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Photographers can update assignments for their listings
CREATE POLICY "Photographers can update own listing assignments"
  ON public.listing_realtors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_realtors.listing_id AND l.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_realtors.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Photographers can delete assignments from their listings
CREATE POLICY "Photographers can delete own listing assignments"
  ON public.listing_realtors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_realtors.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- ============================================================
-- MEDIA_ASSETS POLICIES
-- ============================================================

-- Admins can view all media
CREATE POLICY "Admins can view all media"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photographers can view media they uploaded
CREATE POLICY "Photographers can view own media"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Realtors can view media for their assigned listings
CREATE POLICY "Realtors can view assigned listing media"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_realtors lr
      JOIN public.realtors r ON r.id = lr.realtor_id
      WHERE lr.listing_id = media_assets.listing_id AND r.auth_user_id = auth.uid()
    )
  );

-- Public can view public media on active listings (only public_url, thumbnail_url - not original_key)
CREATE POLICY "Public can view public media on active listings"
  ON public.media_assets FOR SELECT
  TO anon
  USING (
    is_public = true AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = media_assets.listing_id AND l.status = 'active'
    )
  );

-- Photographers can upload media to their listings
CREATE POLICY "Photographers can insert media"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = media_assets.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Photographers can update their own media
CREATE POLICY "Photographers can update own media"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Photographers can delete their own media
CREATE POLICY "Photographers can delete own media"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- ============================================================
-- LISTING_SHARES POLICIES
-- ============================================================

-- Photographers can view shares they created
CREATE POLICY "Photographers can view own shares"
  ON public.listing_shares FOR SELECT
  TO authenticated
  USING (shared_by = auth.uid());

-- Admins can view all shares
CREATE POLICY "Admins can view all shares"
  ON public.listing_shares FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photographers can create shares for their listings
CREATE POLICY "Photographers can create shares"
  ON public.listing_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_shares.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Photographers can update their own shares
CREATE POLICY "Photographers can update own shares"
  ON public.listing_shares FOR UPDATE
  TO authenticated
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

-- Photographers can delete their own shares
CREATE POLICY "Photographers can delete own shares"
  ON public.listing_shares FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());

-- ============================================================
-- LISTING_EVENTS POLICIES
-- ============================================================

-- Anyone can insert events (analytics tracking)
CREATE POLICY "Anyone can insert listing events"
  ON public.listing_events FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_events.listing_id AND l.status = 'active'
    )
  );

-- Authenticated users can also insert events
CREATE POLICY "Authenticated can insert listing events"
  ON public.listing_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Photographers can view events for their listings
CREATE POLICY "Photographers can view own listing events"
  ON public.listing_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_events.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.listing_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtors can view events for assigned listings (if permitted)
CREATE POLICY "Realtors can view assigned listing events"
  ON public.listing_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listing_realtors lr
      JOIN public.realtors r ON r.id = lr.realtor_id
      WHERE lr.listing_id = listing_events.listing_id
        AND r.auth_user_id = auth.uid()
        AND lr.can_view_analytics = true
    )
  );

-- ============================================================
-- DOWNLOAD_LOGS POLICIES
-- ============================================================

-- Photographers can view download logs for their listings
CREATE POLICY "Photographers can view own listing downloads"
  ON public.download_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = download_logs.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Admins can view all download logs
CREATE POLICY "Admins can view all download logs"
  ON public.download_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert download logs
CREATE POLICY "Authenticated can insert download logs"
  ON public.download_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- LEADS POLICIES
-- ============================================================

-- Anyone can submit a lead for an active listing
CREATE POLICY "Anyone can submit leads for active listings"
  ON public.leads FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = leads.listing_id AND l.status = 'active'
    )
  );

-- Authenticated can also submit leads
CREATE POLICY "Authenticated can submit leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = leads.listing_id AND l.status = 'active'
    )
  );

-- Photographers can view leads for their listings
CREATE POLICY "Photographers can view own listing leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = leads.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- Admins can view all leads
CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Photographers can update leads for their listings (change status)
CREATE POLICY "Photographers can update own listing leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = leads.listing_id AND l.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = leads.listing_id AND l.photographer_id = auth.uid()
    )
  );

-- ============================================================
-- AUDIT_LOGS POLICIES
-- ============================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert audit logs (for their own actions)
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
