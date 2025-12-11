-- Sheet Music Checkout Form
CREATE TABLE public.sheet_music_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester VARCHAR(50) NOT NULL DEFAULT 'Fall 2025',
  folder_returned BOOLEAN DEFAULT false,
  music_returned BOOLEAN DEFAULT false,
  missing_items TEXT,
  condition_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Sign-off fields
  signed_off_by UUID REFERENCES auth.users(id),
  signed_off_by_name VARCHAR(255),
  signed_off_at TIMESTAMPTZ,
  sign_off_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, issues_noted
  UNIQUE(user_id, semester)
);

-- Dress Checkout Form
CREATE TABLE public.dress_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester VARCHAR(50) NOT NULL DEFAULT 'Fall 2025',
  dress_returned BOOLEAN DEFAULT false,
  dress_condition VARCHAR(100), -- excellent, good, fair, needs_repair, damaged
  accessories_returned BOOLEAN DEFAULT false,
  missing_items TEXT,
  condition_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Sign-off fields
  signed_off_by UUID REFERENCES auth.users(id),
  signed_off_by_name VARCHAR(255),
  signed_off_at TIMESTAMPTZ,
  sign_off_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, issues_noted
  UNIQUE(user_id, semester)
);

-- Enable RLS
ALTER TABLE public.sheet_music_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dress_checkouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sheet_music_checkouts
CREATE POLICY "Users can view own sheet music checkouts"
  ON public.sheet_music_checkouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sheet music checkouts"
  ON public.sheet_music_checkouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sheet music checkouts"
  ON public.sheet_music_checkouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and librarians can view all sheet music checkouts"
  ON public.sheet_music_checkouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true 
           OR gw_profiles.exec_board_role ILIKE '%librarian%'
           OR gw_profiles.exec_board_role ILIKE '%music%')
    )
  );

CREATE POLICY "Authorized users can sign off sheet music checkouts"
  ON public.sheet_music_checkouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true 
           OR gw_profiles.exec_board_role ILIKE '%librarian%'
           OR gw_profiles.exec_board_role ILIKE '%music%')
    )
  );

-- RLS Policies for dress_checkouts
CREATE POLICY "Users can view own dress checkouts"
  ON public.dress_checkouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dress checkouts"
  ON public.dress_checkouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dress checkouts"
  ON public.dress_checkouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and wardrobe can view all dress checkouts"
  ON public.dress_checkouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true 
           OR gw_profiles.exec_board_role ILIKE '%wardrobe%')
    )
  );

CREATE POLICY "Authorized users can sign off dress checkouts"
  ON public.dress_checkouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true 
           OR gw_profiles.exec_board_role ILIKE '%wardrobe%')
    )
  );