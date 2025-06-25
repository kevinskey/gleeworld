
-- Create a table to track contract recipients and send history
CREATE TABLE public.contract_recipients_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts_v2(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  custom_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES public.profiles(id),
  email_status TEXT NOT NULL DEFAULT 'sent',
  delivery_status TEXT DEFAULT 'pending',
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  is_resend BOOLEAN NOT NULL DEFAULT false,
  resend_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the contract recipients table
ALTER TABLE public.contract_recipients_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies for contract recipients
CREATE POLICY "Users can view contract recipients for their contracts" 
  ON public.contract_recipients_v2 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts_v2 
      WHERE id = contract_id 
      AND (created_by = auth.uid() OR auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'super-admin')
      ))
    )
  );

CREATE POLICY "Users can create contract recipients for their contracts" 
  ON public.contract_recipients_v2 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts_v2 
      WHERE id = contract_id 
      AND (created_by = auth.uid() OR auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'super-admin')
      ))
    )
  );

-- Create index for performance
CREATE INDEX idx_contract_recipients_v2_contract_id ON public.contract_recipients_v2(contract_id);
CREATE INDEX idx_contract_recipients_v2_sent_at ON public.contract_recipients_v2(sent_at DESC);
