-- Create table for executive board module preferences
CREATE TABLE IF NOT EXISTS public.gw_executive_module_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.gw_executive_module_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for executive board members
CREATE POLICY "Executive board members can manage their own module preferences"
ON public.gw_executive_module_preferences
FOR ALL
USING (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND is_exec_board = true 
        AND verified = true
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_gw_executive_module_preferences_updated_at
    BEFORE UPDATE ON public.gw_executive_module_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();