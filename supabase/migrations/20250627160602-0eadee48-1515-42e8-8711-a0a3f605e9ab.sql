
-- Create finance_records table
CREATE TABLE public.finance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stipend', 'receipt', 'payment', 'debit', 'credit')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance DECIMAL(10,2) NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for finance_records
CREATE POLICY "Users can view their own finance records" 
  ON public.finance_records 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own finance records" 
  ON public.finance_records 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own finance records" 
  ON public.finance_records 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own finance records" 
  ON public.finance_records 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE TRIGGER update_finance_records_updated_at
  BEFORE UPDATE ON public.finance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
