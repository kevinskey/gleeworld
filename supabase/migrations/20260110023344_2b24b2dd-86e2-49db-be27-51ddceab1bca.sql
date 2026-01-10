-- Create user radio presets table for customizable channel buttons
CREATE TABLE public.user_radio_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.gw_radio_channels(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_number),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS
ALTER TABLE public.user_radio_presets ENABLE ROW LEVEL SECURITY;

-- Users can view their own presets
CREATE POLICY "Users can view their own presets"
ON public.user_radio_presets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own presets
CREATE POLICY "Users can create their own presets"
ON public.user_radio_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own presets
CREATE POLICY "Users can update their own presets"
ON public.user_radio_presets
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own presets
CREATE POLICY "Users can delete their own presets"
ON public.user_radio_presets
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_radio_presets_user_id ON public.user_radio_presets(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_radio_presets_updated_at
BEFORE UPDATE ON public.user_radio_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();