-- Migration: Fix RLS policies to use only clerk_id (google_id doesn't exist)
-- This migration updates RLS policies that incorrectly reference google_id

-- =====================================================
-- Drop existing policies with google_id reference
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

-- =====================================================
-- Update helper function to use only clerk_id
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users
  WHERE clerk_id = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- Recreate users table policies with clerk_id only
-- =====================================================

-- Users can only view their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (clerk_id = auth.uid()::text);

-- Users can update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (clerk_id = auth.uid()::text)
  WITH CHECK (clerk_id = auth.uid()::text);

-- Users can insert their own record (during signup)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (clerk_id = auth.uid()::text);

-- =====================================================
-- Add service role policies for Edge Functions
-- =====================================================

-- Service role can manage all users (for Edge Functions)
DROP POLICY IF EXISTS "users_service_role" ON users;
CREATE POLICY "users_service_role" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Service role for usage_tracking
DROP POLICY IF EXISTS "usage_tracking_service_role" ON usage_tracking;
CREATE POLICY "usage_tracking_service_role" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Verification
-- =====================================================

COMMENT ON FUNCTION get_current_user_id() IS
'Helper function to get current authenticated user UUID from their clerk_id.
Used in RLS policies to scope data access to the authenticated user only.';
