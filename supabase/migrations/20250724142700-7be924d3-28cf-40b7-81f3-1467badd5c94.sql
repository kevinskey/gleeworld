-- Add budget_id to budget_attachments table to support budget file uploads
ALTER TABLE public.budget_attachments ADD COLUMN budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE;

-- Make event_id nullable since we can now have budget-only attachments
ALTER TABLE public.budget_attachments ALTER COLUMN event_id DROP NOT NULL;

-- Add constraint to ensure either event_id or budget_id is present
ALTER TABLE public.budget_attachments ADD CONSTRAINT budget_attachments_event_or_budget_check 
CHECK (
  (event_id IS NOT NULL AND budget_id IS NULL) OR 
  (event_id IS NULL AND budget_id IS NOT NULL)
);

-- Create budget_user_associations table for easier user management
CREATE TABLE public.budget_user_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit', 'manage')),
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(budget_id, user_id)
);

-- Enable RLS on budget_user_associations
ALTER TABLE public.budget_user_associations ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_user_associations
CREATE POLICY "Budget creators and managers can manage associations"
ON public.budget_user_associations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_user_associations.budget_id
    AND (
      b.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.budget_permissions bp
        WHERE bp.budget_id = b.id 
        AND bp.user_id = auth.uid() 
        AND bp.permission_type = 'manage'
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- Update RLS policy for budgets table to restrict visibility
DROP POLICY IF EXISTS "Users can view budgets they have permission for" ON public.budgets;

CREATE POLICY "Super-admins can view all budgets"
ON public.budgets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super-admin'
  )
);

CREATE POLICY "Users can view budgets they created or have access to"
ON public.budgets
FOR SELECT
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.budget_permissions bp
    WHERE bp.budget_id = budgets.id 
    AND bp.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.budget_user_associations bua
    WHERE bua.budget_id = budgets.id 
    AND bua.user_id = auth.uid()
  )
);

-- Update RLS policy for budget_attachments to support budget files
DROP POLICY IF EXISTS "Users can manage budget attachments for events they have access" ON public.budget_attachments;

CREATE POLICY "Users can manage attachments for budgets they have access to"
ON public.budget_attachments
FOR ALL
USING (
  -- For event attachments (existing logic)
  (event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM events
    WHERE events.id = budget_attachments.event_id 
    AND (
      auth.uid() = events.created_by OR 
      auth.uid() = events.coordinator_id OR 
      auth.uid() = events.event_lead_id OR
      EXISTS (
        SELECT 1 FROM event_team_members
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )) OR
  -- For budget attachments (new logic)
  (budget_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_attachments.budget_id 
    AND (
      b.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM budget_permissions bp
        WHERE bp.budget_id = b.id 
        AND bp.user_id = auth.uid() 
        AND bp.permission_type IN ('edit', 'manage')
      ) OR
      EXISTS (
        SELECT 1 FROM budget_user_associations bua
        WHERE bua.budget_id = b.id 
        AND bua.user_id = auth.uid() 
        AND bua.permission_type IN ('edit', 'manage')
      ) OR
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super-admin')
      )
    )
  ))
);

-- Create storage bucket for budget documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-documents', 'budget-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for budget-documents storage bucket
CREATE POLICY "Users can upload budget documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'budget-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view budget documents they have access to"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'budget-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
    )
  )
);

CREATE POLICY "Users can update their budget documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'budget-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their budget documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'budget-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add indexes for performance
CREATE INDEX idx_budget_attachments_budget_id ON public.budget_attachments(budget_id);
CREATE INDEX idx_budget_user_associations_budget_id ON public.budget_user_associations(budget_id);
CREATE INDEX idx_budget_user_associations_user_id ON public.budget_user_associations(user_id);