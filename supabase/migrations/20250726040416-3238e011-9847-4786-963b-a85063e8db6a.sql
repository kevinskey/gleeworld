-- Add RLS policies for tables that have RLS enabled but no policies

-- 1. gw_audio_files table
CREATE POLICY "Users can view their own audio files" ON public.gw_audio_files
FOR SELECT USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own audio files" ON public.gw_audio_files
FOR ALL USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 2. gw_event_rsvps table
CREATE POLICY "Users can view their own RSVPs" ON public.gw_event_rsvps
FOR SELECT USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own RSVPs" ON public.gw_event_rsvps
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs" ON public.gw_event_rsvps
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all RSVPs" ON public.gw_event_rsvps
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 3. gw_fans table
CREATE POLICY "Fans can view their own profile" ON public.gw_fans
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Fans can update their own profile" ON public.gw_fans
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create fan profile" ON public.gw_fans
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all fan profiles" ON public.gw_fans
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 4. gw_music_analytics table
CREATE POLICY "Users can view analytics for their music" ON public.gw_music_analytics
FOR SELECT USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "System can insert music analytics" ON public.gw_music_analytics
FOR INSERT WITH CHECK (true);

-- 5. gw_payment_records table
CREATE POLICY "Users can view their own payment records" ON public.gw_payment_records
FOR SELECT USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Admins can manage all payment records" ON public.gw_payment_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 6. gw_permissions table
CREATE POLICY "Admins can manage permissions" ON public.gw_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 7. gw_playlist_tracks table
CREATE POLICY "Users can view playlist tracks" ON public.gw_playlist_tracks
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage playlist tracks" ON public.gw_playlist_tracks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 8. gw_product_variants table
CREATE POLICY "Everyone can view product variants" ON public.gw_product_variants
FOR SELECT USING (true);

CREATE POLICY "Admins can manage product variants" ON public.gw_product_variants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 9. gw_scores table
CREATE POLICY "Users can view their own scores" ON public.gw_scores
FOR SELECT USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can manage their own scores" ON public.gw_scores
FOR ALL USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 10. gw_site_settings table
CREATE POLICY "Everyone can view site settings" ON public.gw_site_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage site settings" ON public.gw_site_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- 11. gw_user_permissions table
CREATE POLICY "Users can view their own permissions" ON public.gw_user_permissions
FOR SELECT USING (auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Admins can manage user permissions" ON public.gw_user_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);