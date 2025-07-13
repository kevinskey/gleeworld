-- Create sheet music annotations table
CREATE TABLE public.gw_sheet_music_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('drawing', 'highlight', 'text_note', 'stamp')),
  annotation_data JSONB NOT NULL,
  position_data JSONB NOT NULL, -- x, y, width, height coordinates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sheet music permissions table for role-based access
CREATE TABLE public.gw_sheet_music_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT, -- SATB, soloist, admin, etc.
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'annotate', 'manage')) DEFAULT 'view',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create sheet music analytics table
CREATE TABLE public.gw_sheet_music_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_music_id UUID NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'download', 'annotate', 'print')),
  page_number INTEGER,
  session_duration INTEGER, -- in seconds
  device_type TEXT,
  timestamp_recorded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_gw_sheet_music_annotations_sheet_music_user ON public.gw_sheet_music_annotations(sheet_music_id, user_id);
CREATE INDEX idx_gw_sheet_music_annotations_page ON public.gw_sheet_music_annotations(sheet_music_id, page_number);
CREATE INDEX idx_gw_sheet_music_permissions_sheet_music ON public.gw_sheet_music_permissions(sheet_music_id);
CREATE INDEX idx_gw_sheet_music_permissions_user ON public.gw_sheet_music_permissions(user_id);
CREATE INDEX idx_gw_sheet_music_analytics_sheet_music ON public.gw_sheet_music_analytics(sheet_music_id);
CREATE INDEX idx_gw_sheet_music_analytics_user ON public.gw_sheet_music_analytics(user_id);

-- Enable RLS
ALTER TABLE public.gw_sheet_music_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_sheet_music_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_sheet_music_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for annotations
CREATE POLICY "Users can manage their own annotations" ON public.gw_sheet_music_annotations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view annotations on accessible sheet music" ON public.gw_sheet_music_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_sheet_music sm
      WHERE sm.id = sheet_music_id 
      AND (
        sm.is_public = true OR 
        sm.uploaded_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.gw_sheet_music_permissions smp
          WHERE smp.sheet_music_id = sm.id 
          AND smp.user_id = auth.uid() 
          AND smp.permission_type IN ('view', 'annotate', 'manage')
          AND smp.is_active = true
          AND (smp.expires_at IS NULL OR smp.expires_at > now())
        )
      )
    )
  );

-- RLS Policies for permissions
CREATE POLICY "Users can view permissions for their accessible sheet music" ON public.gw_sheet_music_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_sheet_music sm
      WHERE sm.id = sheet_music_id AND sm.uploaded_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "Admins and sheet music owners can manage permissions" ON public.gw_sheet_music_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_sheet_music sm
      WHERE sm.id = sheet_music_id AND sm.uploaded_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  );

-- RLS Policies for analytics
CREATE POLICY "Users can create their own analytics" ON public.gw_sheet_music_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON public.gw_sheet_music_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_sheet_music_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_sheet_music_annotations_updated_at
  BEFORE UPDATE ON public.gw_sheet_music_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_sheet_music_annotations_updated_at();

-- Helper functions
CREATE OR REPLACE FUNCTION public.user_can_access_sheet_music(sheet_music_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_sheet_music sm
    WHERE sm.id = sheet_music_id_param
    AND (
      sm.is_public = true OR
      sm.uploaded_by = user_id_param OR
      EXISTS (
        SELECT 1 FROM public.gw_sheet_music_permissions smp
        WHERE smp.sheet_music_id = sheet_music_id_param 
        AND smp.user_id = user_id_param 
        AND smp.permission_type IN ('view', 'annotate', 'manage')
        AND smp.is_active = true
        AND (smp.expires_at IS NULL OR smp.expires_at > now())
      ) OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles p
        WHERE p.user_id = user_id_param AND p.is_admin = true
      )
    )
  );
$$;

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
  INSERT INTO public.gw_sheet_music_analytics (
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