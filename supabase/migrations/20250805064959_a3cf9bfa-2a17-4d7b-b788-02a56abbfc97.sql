-- Create Glee Ledger tables for Google Sheets integration
CREATE TABLE public.glee_ledger_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  google_sheet_id TEXT UNIQUE,
  google_sheet_url TEXT,
  sheet_type TEXT NOT NULL DEFAULT 'general',
  template_type TEXT DEFAULT 'running_ledger',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sheet_config JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '{"viewers": [], "editors": []}'
);

-- Enable RLS
ALTER TABLE public.glee_ledger_sheets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all glee ledger sheets"
ON public.glee_ledger_sheets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view sheets they have access to"
ON public.glee_ledger_sheets
FOR SELECT
USING (
  created_by = auth.uid() 
  OR 
  (permissions->>'viewers')::jsonb ? auth.uid()::text
  OR 
  (permissions->>'editors')::jsonb ? auth.uid()::text
);

CREATE POLICY "Users can create their own sheets"
ON public.glee_ledger_sheets
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update sheets they created or have edit access"
ON public.glee_ledger_sheets
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR 
  (permissions->>'editors')::jsonb ? auth.uid()::text
);

-- Create ledger sync logs table
CREATE TABLE public.glee_ledger_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES public.glee_ledger_sheets(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID
);

-- Enable RLS
ALTER TABLE public.glee_ledger_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync logs
CREATE POLICY "Admins can view all sync logs"
ON public.glee_ledger_sync_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view logs for their sheets"
ON public.glee_ledger_sync_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.glee_ledger_sheets 
    WHERE id = glee_ledger_sync_logs.sheet_id 
    AND created_by = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_glee_ledger_sheets_updated_at
BEFORE UPDATE ON public.glee_ledger_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update Google auth tokens for Sheets API
CREATE OR REPLACE FUNCTION public.update_google_sheets_scope()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update existing Google auth tokens to include Sheets API scope
  UPDATE public.google_auth_tokens 
  SET scopes = CASE 
    WHEN scopes IS NULL THEN '["https://www.googleapis.com/auth/spreadsheets"]'
    WHEN scopes::text NOT LIKE '%spreadsheets%' THEN 
      jsonb_insert(scopes, '{-1}', '"https://www.googleapis.com/auth/spreadsheets"')
    ELSE scopes
  END,
  updated_at = now()
  WHERE user_id = auth.uid();
  
  RETURN true;
END;
$$;