-- Migration: Fix RLS policies for Clerk authentication

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can insert own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can update own memory" ON user_memory;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can view own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can insert own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can update own relationship" ON relationship_progress;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;

-- Create permissive policies for Clerk auth
CREATE POLICY "Allow all user operations" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_memory operations" ON user_memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all conversations operations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all conversation_messages operations" ON conversation_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all relationship_progress operations" ON relationship_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read subscriptions" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow read payment_history" ON payment_history FOR SELECT USING (true);
