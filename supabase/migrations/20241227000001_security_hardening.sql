-- Migration: Security Hardening
-- This migration adds additional security features for Phase 4

-- =====================================================
-- Create call sessions table for server-side duration tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  character_id TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  client_reported_duration INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_session_token ON call_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);

-- RLS Policies for call_sessions
CREATE POLICY "call_sessions_select_own" ON call_sessions
  FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "call_sessions_service_role" ON call_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Create audit_logs table for security events
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Only service role can access audit logs
CREATE POLICY "audit_logs_service_role" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Create webhook_events table for idempotency
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload_hash TEXT,
  success BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Only service role can access
CREATE POLICY "webhook_events_service_role" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Function to expire old call sessions
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_call_sessions()
RETURNS void AS $$
BEGIN
  UPDATE call_sessions
  SET
    status = 'expired',
    ended_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
    updated_at = NOW()
  WHERE
    status = 'active'
    AND started_at < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to calculate server-side duration
-- =====================================================

CREATE OR REPLACE FUNCTION end_call_session(
  p_session_token TEXT,
  p_client_duration INTEGER DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  server_duration INTEGER,
  client_duration INTEGER
) AS $$
DECLARE
  v_session call_sessions%ROWTYPE;
  v_server_duration INTEGER;
BEGIN
  -- Get the session
  SELECT * INTO v_session
  FROM call_sessions
  WHERE session_token = p_session_token
  AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate server-side duration
  v_server_duration := EXTRACT(EPOCH FROM (NOW() - v_session.started_at))::INTEGER;

  -- Update session
  UPDATE call_sessions
  SET
    status = 'ended',
    ended_at = NOW(),
    duration_seconds = v_server_duration,
    client_reported_duration = p_client_duration,
    updated_at = NOW()
  WHERE id = v_session.id;

  -- Return duration info
  session_id := v_session.id;
  server_duration := v_server_duration;
  client_duration := p_client_duration;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Ensure all sensitive tables have RLS enabled
-- =====================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'users',
      'user_memory',
      'conversations',
      'conversation_messages',
      'relationship_progress',
      'subscriptions',
      'payment_history',
      'usage_tracking',
      'calls',
      'call_sessions',
      'audit_logs',
      'webhook_events'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END;
$$;

-- =====================================================
-- Add comments for documentation
-- =====================================================

COMMENT ON TABLE call_sessions IS 'Server-side call session tracking for accurate duration calculation';
COMMENT ON TABLE audit_logs IS 'Security audit trail for sensitive operations';
COMMENT ON TABLE webhook_events IS 'Webhook idempotency tracking to prevent duplicate processing';
COMMENT ON FUNCTION expire_old_call_sessions() IS 'Cleanup function to expire abandoned call sessions';
COMMENT ON FUNCTION end_call_session(TEXT, INTEGER) IS 'End a call session and calculate server-side duration';
