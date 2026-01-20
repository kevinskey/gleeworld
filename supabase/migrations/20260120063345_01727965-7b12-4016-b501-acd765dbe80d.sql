-- Create user_page_views table to track all page navigation
CREATE TABLE IF NOT EXISTS user_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  module_id TEXT,
  referrer TEXT,
  session_id TEXT,
  device_type TEXT,
  browser TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_sessions table to track login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT now(),
  session_end TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT now(),
  page_count INTEGER DEFAULT 0,
  device_type TEXT,
  browser TEXT,
  ip_address TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Create user_engagement_summary view for quick stats
CREATE TABLE IF NOT EXISTS user_engagement_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  page_views INTEGER DEFAULT 0,
  unique_pages INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  modules_visited TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE user_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_page_views
CREATE POLICY "Users can insert own page views"
  ON user_page_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all page views"
  ON user_page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super-admin', 'instructor')
    )
  );

CREATE POLICY "Users can view own page views"
  ON user_page_views FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can manage own sessions"
  ON user_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super-admin', 'instructor')
    )
  );

-- RLS Policies for user_engagement_daily
CREATE POLICY "Users can manage own engagement"
  ON user_engagement_daily FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all engagement"
  ON user_engagement_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super-admin', 'instructor')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON user_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON user_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON user_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_engagement_user_date ON user_engagement_daily(user_id, date);