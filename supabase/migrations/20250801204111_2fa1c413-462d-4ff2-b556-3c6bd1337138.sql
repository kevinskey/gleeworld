-- Create table for buckets of love messages
CREATE TABLE public.gw_buckets_of_love (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  recipient_user_id UUID NULL, -- null means message is for everyone
  note_color TEXT NOT NULL DEFAULT 'yellow',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_buckets_of_love ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Members can view all love messages" 
ON public.gw_buckets_of_love 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can create love messages" 
ON public.gw_buckets_of_love 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own love messages" 
ON public.gw_buckets_of_love 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own love messages" 
ON public.gw_buckets_of_love 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_buckets_of_love_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_buckets_of_love_updated_at
  BEFORE UPDATE ON public.gw_buckets_of_love
  FOR EACH ROW
  EXECUTE FUNCTION public.update_buckets_of_love_updated_at();