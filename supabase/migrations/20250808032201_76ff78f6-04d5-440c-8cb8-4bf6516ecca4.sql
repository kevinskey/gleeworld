-- Radio integration tables

-- Create stations table
CREATE TABLE IF NOT EXISTS public.gw_radio_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  stream_url TEXT NOT NULL,
  api_provider TEXT,
  api_endpoint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_radio_stations ENABLE ROW LEVEL SECURITY;

-- Policies for stations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_stations' AND policyname='Public can view public stations' 
  ) THEN
    CREATE POLICY "Public can view public stations"
    ON public.gw_radio_stations
    FOR SELECT
    USING (is_public = true OR public.is_current_user_admin_or_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_stations' AND policyname='Admins can insert stations' 
  ) THEN
    CREATE POLICY "Admins can insert stations"
    ON public.gw_radio_stations
    FOR INSERT
    WITH CHECK (public.is_current_user_admin_or_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_stations' AND policyname='Admins can update stations' 
  ) THEN
    CREATE POLICY "Admins can update stations"
    ON public.gw_radio_stations
    FOR UPDATE
    USING (public.is_current_user_admin_or_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_stations' AND policyname='Admins can delete stations' 
  ) THEN
    CREATE POLICY "Admins can delete stations"
    ON public.gw_radio_stations
    FOR DELETE
    USING (public.is_current_user_admin_or_super_admin());
  END IF;
END $$;

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_gw_radio_stations_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_gw_radio_stations_updated_at
    BEFORE UPDATE ON public.gw_radio_stations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column_v2();
  END IF;
END $$;

-- Create now playing table
CREATE TABLE IF NOT EXISTS public.gw_radio_now_playing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.gw_radio_stations(id) ON DELETE CASCADE,
  artist TEXT,
  title TEXT,
  album TEXT,
  artwork_url TEXT,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_radio_now_playing_station_started ON public.gw_radio_now_playing (station_id, started_at DESC);

-- Enable RLS
ALTER TABLE public.gw_radio_now_playing ENABLE ROW LEVEL SECURITY;

-- Policies for now playing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_now_playing' AND policyname='Public can view now playing for public stations'
  ) THEN
    CREATE POLICY "Public can view now playing for public stations"
    ON public.gw_radio_now_playing
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_radio_stations s
        WHERE s.id = station_id AND (s.is_public = true OR public.is_current_user_admin_or_super_admin())
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_now_playing' AND policyname='Admins can insert now playing'
  ) THEN
    CREATE POLICY "Admins can insert now playing"
    ON public.gw_radio_now_playing
    FOR INSERT
    WITH CHECK (public.is_current_user_admin_or_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_now_playing' AND policyname='Admins can update now playing'
  ) THEN
    CREATE POLICY "Admins can update now playing"
    ON public.gw_radio_now_playing
    FOR UPDATE
    USING (public.is_current_user_admin_or_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gw_radio_now_playing' AND policyname='Admins can delete now playing'
  ) THEN
    CREATE POLICY "Admins can delete now playing"
    ON public.gw_radio_now_playing
    FOR DELETE
    USING (public.is_current_user_admin_or_super_admin());
  END IF;
END $$;

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_gw_radio_now_playing_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_gw_radio_now_playing_updated_at
    BEFORE UPDATE ON public.gw_radio_now_playing
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column_v2();
  END IF;
END $$;