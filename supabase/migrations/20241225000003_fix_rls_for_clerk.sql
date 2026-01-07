-- Migration: Fix RLS policies for Clerk authentication
-- Since we use Clerk (not Supabase Auth), we need different RLS strategies

-- =====================================================
-- Drop existing RLS policies that use auth.uid()
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- User memory policies
DROP POLICY IF EXISTS "Users can view own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can insert own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can update own memory" ON user_memory;

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- Messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON conversation_messages;

-- Relationship policies
DROP POLICY IF EXISTS "Users can view own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can insert own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can update own relationship" ON relationship_progress;

-- Subscription policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;

-- =====================================================
-- Create new permissive policies for client access
-- Security is handled at the application layer via Clerk
-- =====================================================

-- Users table: Allow all operations (Clerk handles authentication)
CREATE POLICY "Allow all user operations" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- User memory: Allow all operations
CREATE POLICY "Allow all user_memory operations" ON user_memory
  FOR ALL USING (true) WITH CHECK (true);

-- Conversations: Allow all operations
CREATE POLICY "Allow all conversations operations" ON conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Conversation messages: Allow all operations
CREATE POLICY "Allow all conversation_messages operations" ON conversation_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Relationship progress: Allow all operations
CREATE POLICY "Allow all relationship_progress operations" ON relationship_progress
  FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions: Allow SELECT for all (service role handles writes via webhooks)
CREATE POLICY "Allow read subscriptions" ON subscriptions
  FOR SELECT USING (true);

-- Keep service role policy for subscription writes
-- Already exists from previous migration

-- Payment history: Allow SELECT for all
CREATE POLICY "Allow read payment_history" ON payment_history
  FOR SELECT USING (true);

-- =====================================================
-- Note: This approach relies on application-layer security
-- via Clerk authentication. The app only accesses data
-- for the authenticated user by filtering with user_id.
-- =====================================================
