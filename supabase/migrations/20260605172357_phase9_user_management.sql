/*
# Phase 9: User Management & Company Operations

## Overview
Adds infrastructure for admin-managed user invitations, account suspension,
and first-time onboarding tracking. Makes the platform self-service for
FVREP admins to onboard photographers without touching the Supabase dashboard.

## New Tables
- `user_invitations`
  - `id` (uuid, PK) - Unique invitation identifier
  - `email` (text, not null) - Invited user's email address
  - `full_name` (text) - Invited user's display name
  - `role` (text, default 'photographer') - Role to assign on acceptance
  - `invited_by` (uuid, FK to profiles) - Admin who sent the invitation
  - `status` (text, default 'pending') - pending/accepted/expired/revoked
  - `invited_at` (timestamptz) - When the invitation was created
  - `accepted_at` (timestamptz, nullable) - When the user accepted
  - `expires_at` (timestamptz) - When the invitation expires (7 days)

## Modified Tables
- `profiles`
  - Added `is_suspended` (boolean, default false) - Blocks dashboard access when true
  - Added `onboarding_completed_at` (timestamptz, nullable) - Tracks first-time setup completion

## Security
- RLS enabled on `user_invitations`
- Only admins (via private.has_role) can SELECT/INSERT/UPDATE invitations
- Indexes on email+status for efficient lookups

## Important Notes
1. The `is_suspended` flag is checked by the frontend ProtectedRoute to block
   access and force sign-out for suspended users.
2. `onboarding_completed_at` being NULL signals a new user who hasn't dismissed
   the onboarding dialog.
3. Invitation expiry is 7 days from creation.
4. The `status` column uses CHECK constraint for valid values.
*/

-- Add is_suspended and onboarding_completed_at to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at timestamptz;
  END IF;
END $$;

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'photographer' CHECK (role IN ('admin', 'photographer')),
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_email_status ON user_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
DROP POLICY IF EXISTS "Admins can view invitations" ON user_invitations;
CREATE POLICY "Admins can view invitations" ON user_invitations
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update invitations" ON user_invitations;
CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
CREATE POLICY "Admins can delete invitations" ON user_invitations
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
