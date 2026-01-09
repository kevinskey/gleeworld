-- Create handbook_edit_logs table to track all edits
CREATE TABLE public.handbook_edit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id TEXT NOT NULL,
  section_title TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT NOT NULL,
  edit_summary TEXT,
  edited_by UUID NOT NULL,
  editor_name TEXT,
  editor_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.handbook_edit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Exec board and admins can view all edit logs
CREATE POLICY "Exec board and admins can view edit logs"
ON public.handbook_edit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Policy: Exec board and admins can insert edit logs
CREATE POLICY "Exec board and admins can insert edit logs"
ON public.handbook_edit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Create index for faster queries
CREATE INDEX idx_handbook_edit_logs_created_at ON public.handbook_edit_logs(created_at DESC);
CREATE INDEX idx_handbook_edit_logs_section_id ON public.handbook_edit_logs(section_id);

-- Create handbook_sections table for dynamic content storage
CREATE TABLE public.handbook_sections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'Book',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.handbook_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view visible sections
CREATE POLICY "Anyone can view visible handbook sections"
ON public.handbook_sections
FOR SELECT
TO authenticated
USING (is_visible = true);

-- Policy: Exec board and admins can view all sections
CREATE POLICY "Exec board and admins can view all sections"
ON public.handbook_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Policy: Exec board and admins can update sections
CREATE POLICY "Exec board and admins can update handbook sections"
ON public.handbook_sections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin', 'exec-board')
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Policy: Admins can insert new sections
CREATE POLICY "Admins can insert handbook sections"
ON public.handbook_sections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super-admin')
    AND is_active = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_handbook_sections_updated_at
BEFORE UPDATE ON public.handbook_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();