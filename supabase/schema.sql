-- Personal Preethi Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_call_at TIMESTAMP WITH TIME ZONE,
  total_calls INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE
);

-- User memory table - stores facts Preethi learns about users
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_mentioned TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, key)
);

-- Conversations table - each call session
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  summary TEXT,
  mood TEXT
);

-- Conversation messages - individual messages in a call
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'preethi')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relationship progress - tracks Preethi's relationship with each user
CREATE TABLE IF NOT EXISTS relationship_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  trust_level INTEGER DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 100),
  flirt_level INTEGER DEFAULT 0 CHECK (flirt_level >= 0 AND flirt_level <= 100),
  inside_jokes TEXT[] DEFAULT '{}',
  pet_names TEXT[] DEFAULT '{}',
  relationship_stage TEXT DEFAULT 'stranger' CHECK (
    relationship_stage IN ('stranger', 'acquaintance', 'friend', 'close_friend', 'flirty', 'romantic')
  ),
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_progress ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = google_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = google_id);

-- User memory policies
CREATE POLICY "Users can view own memory" ON user_memory
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can insert own memory" ON user_memory
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can update own memory" ON user_memory
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Messages policies
CREATE POLICY "Users can view own messages" ON conversation_messages
  FOR SELECT USING (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN users u ON c.user_id = u.id
    WHERE u.google_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own messages" ON conversation_messages
  FOR INSERT WITH CHECK (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN users u ON c.user_id = u.id
    WHERE u.google_id = auth.uid()::text
  ));

-- Relationship progress policies
CREATE POLICY "Users can view own relationship" ON relationship_progress
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can insert own relationship" ON relationship_progress
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can update own relationship" ON relationship_progress
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Function to create user with relationship on signup
CREATE OR REPLACE FUNCTION create_user_with_relationship()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO relationship_progress (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create relationship progress for new users
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_with_relationship();

-- =====================================================
-- Razorpay Subscription Tables
-- =====================================================

-- Subscriptions table for Razorpay
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  razorpay_subscription_id TEXT UNIQUE NOT NULL,
  razorpay_customer_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'weekly_99',
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired')
  ),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment history for receipts
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- in paise (9900 = ₹99)
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

-- RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));

-- Service role can manage subscriptions (for webhook)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage payments" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Multi-Character Support
-- =====================================================

-- Add selected_character to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS selected_character TEXT NOT NULL DEFAULT 'preethi';

-- Add character_id to user_memory
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS character_id TEXT NOT NULL DEFAULT 'preethi';

-- Drop old unique constraint and add new one with character_id
ALTER TABLE user_memory DROP CONSTRAINT IF EXISTS user_memory_user_id_key_key;
ALTER TABLE user_memory ADD CONSTRAINT user_memory_user_character_key UNIQUE(user_id, character_id, key);

-- Add character_id to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS character_id TEXT NOT NULL DEFAULT 'preethi';

-- Add character_id to relationship_progress
ALTER TABLE relationship_progress
ADD COLUMN IF NOT EXISTS character_id TEXT NOT NULL DEFAULT 'preethi';

-- Drop old unique constraint and add new one with character_id
ALTER TABLE relationship_progress DROP CONSTRAINT IF EXISTS relationship_progress_user_id_key;
ALTER TABLE relationship_progress ADD CONSTRAINT relationship_progress_user_character_key UNIQUE(user_id, character_id);

-- Update conversation_messages role check to support multiple characters
ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_role_check;
ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_role_check
  CHECK (role IN ('user', 'preethi', 'ira', 'assistant'));

-- Create indexes for character-based queries
CREATE INDEX IF NOT EXISTS idx_user_memory_character ON user_memory(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_conversations_character ON conversations(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_relationship_character ON relationship_progress(user_id, character_id);

-- Function to create relationship for both characters on user signup
CREATE OR REPLACE FUNCTION create_user_with_relationships()
RETURNS TRIGGER AS $$
BEGIN
  -- Create relationship for Preethi
  INSERT INTO relationship_progress (user_id, character_id)
  VALUES (NEW.id, 'preethi')
  ON CONFLICT (user_id, character_id) DO NOTHING;

  -- Create relationship for Ira
  INSERT INTO relationship_progress (user_id, character_id)
  VALUES (NEW.id, 'ira')
  ON CONFLICT (user_id, character_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to use new function
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_with_relationships();
