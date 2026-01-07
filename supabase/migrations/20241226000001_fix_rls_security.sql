-- Migration: Fix RLS policies for production security
-- This migration replaces permissive policies with proper user-scoped policies
-- Uses auth.uid() from Supabase Auth (Google OAuth)

-- =====================================================
-- Drop all existing permissive policies
-- =====================================================

-- Users table
DROP POLICY IF EXISTS "Allow all user operations" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- User memory
DROP POLICY IF EXISTS "Allow all user_memory operations" ON user_memory;
DROP POLICY IF EXISTS "Users can view own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can insert own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can update own memory" ON user_memory;

-- Conversations
DROP POLICY IF EXISTS "Allow all conversations operations" ON conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- Conversation messages
DROP POLICY IF EXISTS "Allow all conversation_messages operations" ON conversation_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON conversation_messages;

-- Relationship progress
DROP POLICY IF EXISTS "Allow all relationship_progress operations" ON relationship_progress;
DROP POLICY IF EXISTS "Users can view own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can insert own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can update own relationship" ON relationship_progress;

-- Subscriptions
DROP POLICY IF EXISTS "Allow read subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;

-- Payment history
DROP POLICY IF EXISTS "Allow read payment_history" ON payment_history;
DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;

-- =====================================================
-- Create calls table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  character_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);

-- Drop existing call policies if any
DROP POLICY IF EXISTS "Users can view own calls" ON calls;
DROP POLICY IF EXISTS "Users can insert own calls" ON calls;
DROP POLICY IF EXISTS "calls_select_own" ON calls;
DROP POLICY IF EXISTS "calls_insert_own" ON calls;
DROP POLICY IF EXISTS "calls_update_own" ON calls;

-- =====================================================
-- Create helper function for user lookup
-- =====================================================

-- Function to get current user's internal UUID from their auth ID
-- Uses clerk_id (primary) with fallback to google_id for compatibility
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users
  WHERE clerk_id = auth.uid()::text
     OR google_id = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- Users table policies
-- =====================================================

-- Users can only view their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (clerk_id = auth.uid()::text OR google_id = auth.uid()::text);

-- Users can update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (clerk_id = auth.uid()::text OR google_id = auth.uid()::text)
  WITH CHECK (clerk_id = auth.uid()::text OR google_id = auth.uid()::text);

-- Users can insert their own record (during signup)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (clerk_id = auth.uid()::text OR google_id = auth.uid()::text);

-- =====================================================
-- Calls table policies
-- =====================================================

-- Users can only view their own calls
CREATE POLICY "calls_select_own" ON calls
  FOR SELECT USING (user_id = get_current_user_id());

-- Users can insert calls for themselves
CREATE POLICY "calls_insert_own" ON calls
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Users can update their own calls (e.g., set ended_at)
CREATE POLICY "calls_update_own" ON calls
  FOR UPDATE USING (user_id = get_current_user_id());

-- =====================================================
-- User memory table policies
-- =====================================================

-- Users can only view their own memories
CREATE POLICY "user_memory_select_own" ON user_memory
  FOR SELECT USING (user_id = get_current_user_id());

-- Users can insert their own memories
CREATE POLICY "user_memory_insert_own" ON user_memory
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Users can update their own memories
CREATE POLICY "user_memory_update_own" ON user_memory
  FOR UPDATE USING (user_id = get_current_user_id());

-- Users can delete their own memories
CREATE POLICY "user_memory_delete_own" ON user_memory
  FOR DELETE USING (user_id = get_current_user_id());

-- =====================================================
-- Conversations table policies
-- =====================================================

-- Users can only view their own conversations
CREATE POLICY "conversations_select_own" ON conversations
  FOR SELECT USING (user_id = get_current_user_id());

-- Users can insert their own conversations
CREATE POLICY "conversations_insert_own" ON conversations
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Users can update their own conversations
CREATE POLICY "conversations_update_own" ON conversations
  FOR UPDATE USING (user_id = get_current_user_id());

-- =====================================================
-- Conversation messages table policies
-- =====================================================

-- Users can view messages from their own conversations
CREATE POLICY "conversation_messages_select_own" ON conversation_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = get_current_user_id()
    )
  );

-- Users can insert messages to their own conversations
CREATE POLICY "conversation_messages_insert_own" ON conversation_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = get_current_user_id()
    )
  );

-- =====================================================
-- Relationship progress table policies
-- =====================================================

-- Users can view their own relationship progress
CREATE POLICY "relationship_progress_select_own" ON relationship_progress
  FOR SELECT USING (user_id = get_current_user_id());

-- Users can insert their own relationship progress
CREATE POLICY "relationship_progress_insert_own" ON relationship_progress
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Users can update their own relationship progress
CREATE POLICY "relationship_progress_update_own" ON relationship_progress
  FOR UPDATE USING (user_id = get_current_user_id());

-- =====================================================
-- Subscriptions table policies
-- =====================================================

-- Users can only view their own subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (user_id = get_current_user_id());

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "subscriptions_service_role" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Payment history table policies
-- =====================================================

-- Users can only view their own payment history
CREATE POLICY "payment_history_select_own" ON payment_history
  FOR SELECT USING (user_id = get_current_user_id());

-- Service role can manage all payments (for webhooks)
CREATE POLICY "payment_history_service_role" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Create usage tracking table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_seconds INTEGER DEFAULT 0,
  call_count INTEGER DEFAULT 0,
  last_call_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "usage_tracking_select_own" ON usage_tracking
  FOR SELECT USING (user_id = get_current_user_id());

-- Service role can manage usage (for Edge Functions)
CREATE POLICY "usage_tracking_service_role" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);

-- =====================================================
-- Grant necessary permissions
-- =====================================================

-- Ensure authenticated users can use the helper function
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- =====================================================
-- Verification comment
-- =====================================================

COMMENT ON FUNCTION get_current_user_id() IS
'Helper function to get current authenticated user UUID from their clerk_id/google_id.
Used in RLS policies to scope data access to the authenticated user only.';
