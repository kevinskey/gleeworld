-- Security Fix Migration Part 1: Enable RLS and Create Policies for Existing Tables

-- 1. Enable RLS on tables that are missing it (only existing tables)
ALTER TABLE public.food_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for food_budget
CREATE POLICY "Users can view food budget for events they have access to"
ON public.food_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = food_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage food budget for events they have access to"
ON public.food_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = food_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 3. Create RLS policies for materials_budget
CREATE POLICY "Users can view materials budget for events they have access to"
ON public.materials_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = materials_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage materials budget for events they have access to"
ON public.materials_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = materials_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 4. Create RLS policies for transport_budget
CREATE POLICY "Users can view transport budget for events they have access to"
ON public.transport_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = transport_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage transport budget for events they have access to"
ON public.transport_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = transport_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 5. Create RLS policies for media_budget
CREATE POLICY "Users can view media budget for events they have access to"
ON public.media_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = media_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage media budget for events they have access to"
ON public.media_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = media_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 6. Create RLS policies for promo_budget
CREATE POLICY "Users can view promo budget for events they have access to"
ON public.promo_budget FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = promo_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

CREATE POLICY "Users can manage promo budget for events they have access to"
ON public.promo_budget FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = promo_budget.event_id 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.event_team_members 
        WHERE event_team_members.event_id = events.id 
        AND event_team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super-admin')
      )
    )
  )
);

-- 7. Create RLS policies for finance_records
CREATE POLICY "Admins can manage all finance records"
ON public.finance_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view finance records for their events"
ON public.finance_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id::text = finance_records.reference 
    AND (
      events.created_by = auth.uid() OR 
      events.coordinator_id = auth.uid() OR 
      events.event_lead_id = auth.uid()
    )
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 8. Create RLS policies for receipts
CREATE POLICY "Admins can manage all receipts"
ON public.receipts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own receipts"
ON public.receipts FOR ALL
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 9. Create RLS policies for performer_availability
CREATE POLICY "Admins can manage all performer availability"
ON public.performer_availability FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Performers can manage their own availability"
ON public.performer_availability FOR ALL
USING (
  performer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 10. Create RLS policies for performers
CREATE POLICY "Admins can manage all performers"
ON public.performers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view their own performer record"
ON public.performers FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- 11. Create RLS policies for music_tracks
CREATE POLICY "Public can view public music tracks"
ON public.music_tracks FOR SELECT
USING (is_public = true);

CREATE POLICY "Admins can manage all music tracks"
ON public.music_tracks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own music tracks"
ON public.music_tracks FOR ALL
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);