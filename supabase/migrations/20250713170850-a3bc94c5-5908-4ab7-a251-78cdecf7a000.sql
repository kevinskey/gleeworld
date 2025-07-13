-- Create sheet music management tables

-- Main sheet music metadata table
CREATE TABLE public.sheet_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  arranger TEXT,
  voice_parts TEXT[] DEFAULT ARRAY['SATB'], -- Array of voice parts (SATB, Solo, etc.)
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  genre TEXT,
  language TEXT DEFAULT 'English',
  duration_minutes INTEGER,
  key_signature TEXT,
  time_signature TEXT,
  tempo_marking TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  file_path TEXT NOT NULL, -- Path in the sheet-music bucket
  file_size INTEGER,
  page_count INTEGER,
  thumbnail_url TEXT, -- Optional thumbnail image
  audio_reference_url TEXT, -- Link to reference audio
  event_context TEXT, -- e.g., 'Centennial Concert'
  ensemble_type TEXT DEFAULT 'choir', -- choir, small_group, solo, etc.
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User annotations for sheet music
CREATE TABLE public.sheet_music_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_music_id UUID NOT NULL REFERENCES public.sheet_music(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('drawing', 'highlight', 'text_note')),
  annotation_data JSONB NOT NULL, -- Stores drawing paths, highlight coordinates, or text content
  position_data JSONB, -- X, Y coordinates and dimensions
  color TEXT DEFAULT '#ff0000',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sheet_music_id, user_id, page_number, id)
);

-- Setlists (collections of sheet music)
CREATE TABLE public.sheet_music_setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_context TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Items in setlists with ordering
CREATE TABLE public.sheet_music_setlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.sheet_music_setlists(id) ON DELETE CASCADE,
  sheet_music_id UUID NOT NULL REFERENCES public.sheet_music(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL,
  notes TEXT, -- Performance notes for this piece in this setlist
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setlist_id, order_position)
);

-- User permissions for accessing sheet music
CREATE TABLE public.sheet_music_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_music_id UUID NOT NULL REFERENCES public.sheet_music(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_required TEXT, -- e.g., 'admin', 'member', 'soprano', 'alto', etc.
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'annotate', 'manage')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Usage analytics
CREATE TABLE public.sheet_music_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_music_id UUID NOT NULL REFERENCES public.sheet_music(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'download', 'annotate', 'print')),
  page_number INTEGER,
  session_duration INTEGER, -- in seconds
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sheet_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_music_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_music_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_music_setlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_music_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_music_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sheet_music
CREATE POLICY "Users can view public sheet music" ON public.sheet_music
  FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view sheet music they have permission for" ON public.sheet_music
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      is_public = true OR
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.sheet_music_permissions smp
        WHERE smp.sheet_music_id = id 
        AND smp.user_id = auth.uid() 
        AND smp.permission_type IN ('view', 'manage')
        AND smp.is_active = true
        AND (smp.expires_at IS NULL OR smp.expires_at > now())
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin', 'super-admin'])
      )
    )
  );

CREATE POLICY "Admins and uploaders can manage sheet music" ON public.sheet_music
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin', 'super-admin'])
      )
    )
  );

CREATE POLICY "Authenticated users can upload sheet music" ON public.sheet_music
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

-- RLS Policies for annotations
CREATE POLICY "Users can manage their own annotations" ON public.sheet_music_annotations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view annotations on accessible sheet music" ON public.sheet_music_annotations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.sheet_music sm
      WHERE sm.id = sheet_music_id 
      AND (
        sm.is_public = true OR
        sm.uploaded_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.sheet_music_permissions smp
          WHERE smp.sheet_music_id = sm.id 
          AND smp.user_id = auth.uid() 
          AND smp.permission_type IN ('view', 'manage')
          AND smp.is_active = true
        ) OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin', 'super-admin'])
        )
      )
    )
  );

-- RLS Policies for setlists
CREATE POLICY "Users can manage their own setlists" ON public.sheet_music_setlists
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can view public setlists" ON public.sheet_music_setlists
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

-- RLS Policies for setlist items
CREATE POLICY "Users can manage items in their setlists" ON public.sheet_music_setlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sheet_music_setlists sms
      WHERE sms.id = setlist_id AND sms.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view items in accessible setlists" ON public.sheet_music_setlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sheet_music_setlists sms
      WHERE sms.id = setlist_id AND (sms.is_public = true OR sms.created_by = auth.uid())
    )
  );

-- RLS Policies for permissions
CREATE POLICY "Admins and sheet music owners can manage permissions" ON public.sheet_music_permissions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin', 'super-admin'])
      ) OR
      EXISTS (
        SELECT 1 FROM public.sheet_music sm
        WHERE sm.id = sheet_music_id AND sm.uploaded_by = auth.uid()
      )
    )
  );

-- RLS Policies for analytics
CREATE POLICY "Users can create their own analytics entries" ON public.sheet_music_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON public.sheet_music_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = ANY(ARRAY['admin', 'super-admin'])
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_sheet_music_tags ON public.sheet_music USING GIN(tags);
CREATE INDEX idx_sheet_music_voice_parts ON public.sheet_music USING GIN(voice_parts);
CREATE INDEX idx_sheet_music_uploaded_by ON public.sheet_music(uploaded_by);
CREATE INDEX idx_sheet_music_created_at ON public.sheet_music(created_at DESC);

CREATE INDEX idx_annotations_sheet_music_user ON public.sheet_music_annotations(sheet_music_id, user_id);
CREATE INDEX idx_annotations_page_number ON public.sheet_music_annotations(page_number);

CREATE INDEX idx_setlist_items_setlist_order ON public.sheet_music_setlist_items(setlist_id, order_position);

CREATE INDEX idx_permissions_sheet_music_user ON public.sheet_music_permissions(sheet_music_id, user_id);
CREATE INDEX idx_permissions_active ON public.sheet_music_permissions(is_active, expires_at);

CREATE INDEX idx_analytics_sheet_music ON public.sheet_music_analytics(sheet_music_id);
CREATE INDEX idx_analytics_user_action ON public.sheet_music_analytics(user_id, action_type);
CREATE INDEX idx_analytics_created_at ON public.sheet_music_analytics(created_at DESC);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION public.update_sheet_music_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_sheet_music_updated_at
  BEFORE UPDATE ON public.sheet_music
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sheet_music_updated_at();

CREATE TRIGGER update_sheet_music_annotations_updated_at
  BEFORE UPDATE ON public.sheet_music_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sheet_music_updated_at();

CREATE TRIGGER update_sheet_music_setlists_updated_at
  BEFORE UPDATE ON public.sheet_music_setlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sheet_music_updated_at();

-- Function to check if user can access sheet music
CREATE OR REPLACE FUNCTION public.user_can_access_sheet_music(sheet_music_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sheet_music sm
    WHERE sm.id = sheet_music_id_param
    AND (
      sm.is_public = true OR
      sm.uploaded_by = user_id_param OR
      EXISTS (
        SELECT 1 FROM public.sheet_music_permissions smp
        WHERE smp.sheet_music_id = sheet_music_id_param 
        AND smp.user_id = user_id_param 
        AND smp.permission_type IN ('view', 'manage')
        AND smp.is_active = true
        AND (smp.expires_at IS NULL OR smp.expires_at > now())
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_id_param AND p.role = ANY(ARRAY['admin', 'super-admin'])
      )
    )
  );
$$;

-- Function to log sheet music analytics
CREATE OR REPLACE FUNCTION public.log_sheet_music_analytics(
  sheet_music_id_param UUID,
  user_id_param UUID,
  action_type_param TEXT,
  page_number_param INTEGER DEFAULT NULL,
  session_duration_param INTEGER DEFAULT NULL,
  device_type_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.sheet_music_analytics (
    sheet_music_id, user_id, action_type, page_number, 
    session_duration, device_type
  )
  VALUES (
    sheet_music_id_param, user_id_param, action_type_param, 
    page_number_param, session_duration_param, device_type_param
  )
  RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$$;