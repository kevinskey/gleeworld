-- Create academy group members table (separate from messaging groups)
CREATE TABLE IF NOT EXISTS public.gw_academy_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.gw_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_academy_group_member UNIQUE (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.gw_academy_group_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view group members
CREATE POLICY "Anyone can view academy group members"
  ON public.gw_academy_group_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to join groups
CREATE POLICY "Users can join academy groups"
  ON public.gw_academy_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to leave groups
CREATE POLICY "Users can leave academy groups"
  ON public.gw_academy_group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update member count
CREATE OR REPLACE FUNCTION update_gw_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.gw_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.gw_groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academy_group_member_count_trigger
  AFTER INSERT OR DELETE ON public.gw_academy_group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_gw_group_member_count();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_academy_group_members;