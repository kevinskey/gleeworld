-- Create student intake and size verification tables
CREATE TABLE public.gw_student_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  student_id TEXT,
  academic_year TEXT NOT NULL,
  major TEXT,
  phone_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Size measurements
  dress_size TEXT,
  bust_measurement NUMERIC(5,2),
  waist_measurement NUMERIC(5,2),
  hip_measurement NUMERIC(5,2),
  height_feet INTEGER,
  height_inches INTEGER,
  shoe_size TEXT,
  glove_size TEXT,
  
  -- Verification status
  intake_status TEXT DEFAULT 'pending' CHECK (intake_status IN ('pending', 'verified', 'approved', 'rejected')),
  size_verified BOOLEAN DEFAULT false,
  size_verified_by UUID REFERENCES auth.users(id),
  size_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Wardrobe assignments
  assigned_dress_id UUID REFERENCES gw_wardrobe_inventory(id),
  assigned_shoes_id UUID REFERENCES gw_wardrobe_inventory(id),
  assigned_accessories TEXT[], -- JSON array of accessory IDs
  
  -- Processing metadata
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create size verification log
CREATE TABLE public.gw_size_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES gw_student_intake(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES auth.users(id),
  
  -- Original vs verified measurements
  original_measurements JSONB,
  verified_measurements JSONB,
  
  verification_notes TEXT,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('approved', 'needs_remeasurement', 'rejected')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add size fields to gw_profiles if they don't exist
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS dress_size TEXT,
ADD COLUMN IF NOT EXISTS measurements JSONB,
ADD COLUMN IF NOT EXISTS wardrobe_assignments JSONB;

-- Create indexes
CREATE INDEX idx_student_intake_user_id ON gw_student_intake(user_id);
CREATE INDEX idx_student_intake_status ON gw_student_intake(intake_status);
CREATE INDEX idx_student_intake_verified ON gw_student_intake(size_verified);
CREATE INDEX idx_size_verification_intake ON gw_size_verification_log(intake_id);

-- Enable RLS
ALTER TABLE public.gw_student_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_size_verification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student intake
CREATE POLICY "Students can view their own intake records"
ON public.gw_student_intake
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Students can create their own intake records"
ON public.gw_student_intake
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their pending intake records"
ON public.gw_student_intake
FOR UPDATE
USING (auth.uid() = user_id AND intake_status = 'pending');

CREATE POLICY "Admins can manage all intake records"
ON public.gw_student_intake
FOR ALL
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Tour managers can verify sizes"
ON public.gw_student_intake
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM gw_executive_board_members 
  WHERE user_id = auth.uid() 
  AND position = 'tour_manager' 
  AND is_active = true
) OR EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS Policies for verification log
CREATE POLICY "Verification log read access"
ON public.gw_size_verification_log
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM gw_student_intake si
  WHERE si.id = intake_id 
  AND (si.user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ))
));

CREATE POLICY "Verifiers can create log entries"
ON public.gw_size_verification_log
FOR INSERT
WITH CHECK (auth.uid() = verifier_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_student_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_intake_updated_at
  BEFORE UPDATE ON public.gw_student_intake
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_intake_updated_at();