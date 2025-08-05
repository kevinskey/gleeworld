-- Create dues records table
CREATE TABLE public.gw_dues_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  due_date DATE NOT NULL DEFAULT '2025-09-15',
  semester TEXT NOT NULL DEFAULT 'Fall 2025',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create payment plans table
CREATE TABLE public.gw_dues_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dues_record_id UUID NOT NULL REFERENCES public.gw_dues_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('full_payment', 'two_installments', 'three_installments')),
  total_amount DECIMAL(10,2) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment plan installments table
CREATE TABLE public.gw_dues_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_plan_id UUID NOT NULL REFERENCES public.gw_dues_payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dues reminders table
CREATE TABLE public.gw_dues_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dues_record_id UUID REFERENCES public.gw_dues_records(id) ON DELETE CASCADE,
  payment_plan_id UUID REFERENCES public.gw_dues_payment_plans(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES public.gw_dues_installments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming_due', 'overdue', 'payment_plan_reminder')),
  message TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_dues_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_dues_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_dues_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_dues_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_dues_records
CREATE POLICY "Users can view their own dues records" ON public.gw_dues_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all dues records" ON public.gw_dues_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage all dues records" ON public.gw_dues_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for gw_dues_payment_plans
CREATE POLICY "Users can view their own payment plans" ON public.gw_dues_payment_plans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payment plans" ON public.gw_dues_payment_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Users can create their own payment plans" ON public.gw_dues_payment_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all payment plans" ON public.gw_dues_payment_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for gw_dues_installments
CREATE POLICY "Users can view their own installments" ON public.gw_dues_installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_dues_payment_plans
      WHERE id = payment_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all installments" ON public.gw_dues_installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage all installments" ON public.gw_dues_installments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for gw_dues_reminders
CREATE POLICY "Users can view their own reminders" ON public.gw_dues_reminders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all reminders" ON public.gw_dues_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage all reminders" ON public.gw_dues_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_dues()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_dues_records_updated_at
  BEFORE UPDATE ON public.gw_dues_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_dues();

CREATE TRIGGER update_gw_dues_payment_plans_updated_at
  BEFORE UPDATE ON public.gw_dues_payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_dues();

CREATE TRIGGER update_gw_dues_installments_updated_at
  BEFORE UPDATE ON public.gw_dues_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_dues();

CREATE TRIGGER update_gw_dues_reminders_updated_at
  BEFORE UPDATE ON public.gw_dues_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_dues();

-- Function to create payment plan installments
CREATE OR REPLACE FUNCTION public.create_payment_plan_installments(
  plan_id UUID,
  plan_type TEXT,
  total_amount DECIMAL,
  first_due_date DATE DEFAULT '2025-09-15'
)
RETURNS VOID AS $$
DECLARE
  installment_amount DECIMAL;
  installment_count INTEGER;
  current_due_date DATE;
  i INTEGER;
BEGIN
  -- Determine installment details based on plan type
  CASE plan_type
    WHEN 'full_payment' THEN
      installment_count := 1;
      installment_amount := total_amount;
      current_due_date := first_due_date;
    WHEN 'two_installments' THEN
      installment_count := 2;
      installment_amount := total_amount / 2;
      current_due_date := first_due_date - INTERVAL '30 days'; -- First payment 30 days before due date
    WHEN 'three_installments' THEN
      installment_count := 3;
      installment_amount := total_amount / 3;
      current_due_date := first_due_date - INTERVAL '60 days'; -- First payment 60 days before due date
  END CASE;

  -- Create installments
  FOR i IN 1..installment_count LOOP
    INSERT INTO public.gw_dues_installments (
      payment_plan_id,
      installment_number,
      amount,
      due_date
    ) VALUES (
      plan_id,
      i,
      CASE 
        WHEN i = installment_count THEN total_amount - (installment_amount * (installment_count - 1))
        ELSE installment_amount
      END,
      current_due_date
    );
    
    -- Move to next due date (30 days later for multi-installment plans)
    IF plan_type != 'full_payment' THEN
      current_due_date := current_due_date + INTERVAL '30 days';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create dues records for all current members
CREATE OR REPLACE FUNCTION public.create_dues_for_semester(
  semester_name TEXT DEFAULT 'Fall 2025',
  due_date_param DATE DEFAULT '2025-09-15',
  amount_param DECIMAL DEFAULT 150.00
)
RETURNS INTEGER AS $$
DECLARE
  member_record RECORD;
  created_count INTEGER := 0;
BEGIN
  -- Create dues records for all current members (exclude admins if desired)
  FOR member_record IN 
    SELECT user_id 
    FROM public.gw_profiles 
    WHERE role IN ('member', 'executive') 
    AND user_id NOT IN (
      SELECT user_id 
      FROM public.gw_dues_records 
      WHERE semester = semester_name
    )
  LOOP
    INSERT INTO public.gw_dues_records (
      user_id,
      amount,
      due_date,
      semester,
      status
    ) VALUES (
      member_record.user_id,
      amount_param,
      due_date_param,
      semester_name,
      'pending'
    );
    
    created_count := created_count + 1;
  END LOOP;
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create reminder notifications
CREATE OR REPLACE FUNCTION public.create_dues_reminder_notifications()
RETURNS INTEGER AS $$
DECLARE
  reminder_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Create notifications for pending reminders
  FOR reminder_record IN 
    SELECT dr.*, gp.full_name, gp.email
    FROM public.gw_dues_reminders dr
    JOIN public.gw_profiles gp ON gp.user_id = dr.user_id
    WHERE dr.status = 'pending' 
    AND dr.scheduled_date <= CURRENT_DATE
  LOOP
    -- Insert into notifications table
    INSERT INTO public.gw_notifications (
      user_id,
      title,
      message,
      type,
      related_id
    ) VALUES (
      reminder_record.user_id,
      'Dues Payment Reminder',
      reminder_record.message,
      'dues_reminder',
      reminder_record.dues_record_id
    );
    
    -- Mark reminder as sent
    UPDATE public.gw_dues_reminders 
    SET status = 'sent', sent_at = now()
    WHERE id = reminder_record.id;
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;