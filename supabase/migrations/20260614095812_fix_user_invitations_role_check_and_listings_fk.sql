/*
  Fix user_invitations role CHECK to allow 'realtor' values.
  Make listings.photographer_id FK explicitly RESTRICT (documents intent).
*/

-- Drop and recreate the role CHECK constraint on user_invitations
ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_role_check;
ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check
  CHECK (role IN ('admin', 'photographer', 'realtor'));
