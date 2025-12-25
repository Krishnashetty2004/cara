-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMP,
  daily_minutes_used INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT NOW(),
  total_call_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call history
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (clerk_id = auth.jwt()->>'sub');

-- Users can only see their own calls
CREATE POLICY "Users can view own calls" ON public.calls
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.users WHERE clerk_id = auth.jwt()->>'sub'
  ));

CREATE POLICY "Users can insert own calls" ON public.calls
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM public.users WHERE clerk_id = auth.jwt()->>'sub'
  ));

-- Function to reset daily minutes if 24 hours have passed
CREATE OR REPLACE FUNCTION reset_daily_minutes_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.daily_reset_at < NOW() - INTERVAL '24 hours' THEN
    NEW.daily_minutes_used := 0;
    NEW.daily_reset_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_minutes
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_minutes_if_needed();

-- Function to create or get user on login
CREATE OR REPLACE FUNCTION public.get_or_create_user(
  p_clerk_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS public.users AS $$
DECLARE
  v_user public.users;
BEGIN
  -- Try to get existing user
  SELECT * INTO v_user FROM public.users WHERE clerk_id = p_clerk_id;

  -- If not found, create new user
  IF v_user IS NULL THEN
    INSERT INTO public.users (clerk_id, email, name, avatar_url)
    VALUES (p_clerk_id, p_email, p_name, p_avatar_url)
    RETURNING * INTO v_user;
  END IF;

  RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_users_clerk_id ON public.users(clerk_id);
CREATE INDEX idx_calls_user_id ON public.calls(user_id);
CREATE INDEX idx_calls_started_at ON public.calls(started_at DESC);
