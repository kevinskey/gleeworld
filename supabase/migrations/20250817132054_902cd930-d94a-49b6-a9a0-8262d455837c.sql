-- Create recording shares table for internal app sharing
CREATE TABLE public.gw_recording_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.gw_recordings(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recording_id, shared_with)
);

-- Enable RLS
ALTER TABLE public.gw_recording_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_recording_shares
CREATE POLICY "Recording owners can manage shares" 
ON public.gw_recording_shares 
FOR ALL 
USING (
  shared_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.gw_recordings r 
    WHERE r.id = recording_id AND r.recorded_by = auth.uid()
  )
);

CREATE POLICY "Recipients can view their shares" 
ON public.gw_recording_shares 
FOR SELECT 
USING (shared_with = auth.uid());

-- Update gw_recordings RLS to allow viewing shared recordings
CREATE POLICY "Users can view recordings shared with them" 
ON public.gw_recordings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_recording_shares rs 
    WHERE rs.recording_id = id AND rs.shared_with = auth.uid()
  )
);

-- Add submission_id to gw_recordings to link back to grading results
ALTER TABLE public.gw_recordings 
ADD COLUMN submission_id UUID REFERENCES public.gw_sight_singing_submissions(id) ON DELETE SET NULL;