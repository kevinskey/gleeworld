-- Create Glee Club Contacts table with exact column names from CSV
CREATE TABLE public.glee_club_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Required fields
  "Email" TEXT NOT NULL UNIQUE,
  
  -- Status and dates
  "Status" TEXT NOT NULL DEFAULT 'Active' CHECK ("Status" IN ('Active', 'Unsubscribed', 'Bounced', 'Unknown')),
  "StatusChangeDate" TIMESTAMP WITH TIME ZONE,
  "DateUpdated" TIMESTAMP WITH TIME ZONE,
  "DateAdded" TIMESTAMP WITH TIME ZONE,
  
  -- Source and tracking
  "Source" TEXT,
  "CreatedFromIP" TEXT,
  
  -- Email metrics
  "TotalSent" INTEGER NOT NULL DEFAULT 0 CHECK ("TotalSent" >= 0),
  "TotalFailed" INTEGER NOT NULL DEFAULT 0 CHECK ("TotalFailed" >= 0),
  "TotalOpened" INTEGER NOT NULL DEFAULT 0 CHECK ("TotalOpened" >= 0),
  "TotalClicked" INTEGER NOT NULL DEFAULT 0 CHECK ("TotalClicked" >= 0),
  
  -- Last action dates
  "LastSent" TIMESTAMP WITH TIME ZONE,
  "LastFailed" TIMESTAMP WITH TIME ZONE,
  "LastOpened" TIMESTAMP WITH TIME ZONE,
  "LastClicked" TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  "ErrorCode" TEXT,
  "FriendlyErrorMessage" TEXT,
  
  -- Consent
  "ConsentDate" TIMESTAMP WITH TIME ZONE,
  "ConsentIP" TEXT,
  "ConsentTracking" BOOLEAN,
  
  -- Name fields
  "FirstName" TEXT,
  "LastName" TEXT,
  
  -- Unsubscribe
  "UnsubscribeReason" TEXT,
  "UnsubscribeReasonNotes" TEXT,
  
  -- Additional profile
  "display_name" TEXT,
  "last_update" TIMESTAMP WITH TIME ZONE,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "class" TEXT,
  
  -- Internal tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_glee_club_contacts_email ON public.glee_club_contacts("Email");
CREATE INDEX idx_glee_club_contacts_status ON public.glee_club_contacts("Status");
CREATE INDEX idx_glee_club_contacts_date_updated ON public.glee_club_contacts("DateUpdated");
CREATE INDEX idx_glee_club_contacts_class ON public.glee_club_contacts("class");

-- Enable Row Level Security
ALTER TABLE public.glee_club_contacts ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything
CREATE POLICY "Admins can manage all contacts"
ON public.glee_club_contacts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.id = auth.uid()
    AND gw_profiles.role IN ('admin', 'super_admin')
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_glee_club_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_glee_club_contacts_updated_at
BEFORE UPDATE ON public.glee_club_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_glee_club_contacts_updated_at();

-- Create automation trigger for status changes
CREATE OR REPLACE FUNCTION public.handle_glee_club_contact_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set StatusChangeDate when Status changes to Unsubscribed or Bounced
  IF NEW."Status" IN ('Unsubscribed', 'Bounced') AND 
     (OLD."Status" IS NULL OR OLD."Status" != NEW."Status") AND 
     NEW."StatusChangeDate" IS NULL THEN
    NEW."StatusChangeDate" = now();
  END IF;
  
  -- Auto-set ConsentTracking when ConsentDate is present
  IF NEW."ConsentDate" IS NOT NULL AND NEW."ConsentTracking" IS NULL THEN
    NEW."ConsentTracking" = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER handle_glee_club_contact_status_change
BEFORE INSERT OR UPDATE ON public.glee_club_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_glee_club_contact_status_change();