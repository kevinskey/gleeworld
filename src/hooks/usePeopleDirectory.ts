import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DirectoryPerson {
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  headshot_url: string | null;
  role: string | null;
  title: string | null;
  is_section_leader: boolean;
  voice_part: string | null;
  phone: string | null;
  phone_number: string | null;
  status: string | null;
  disabled: boolean;
}

const DIRECTORY_SELECT =
  'user_id, email, full_name, display_name, first_name, last_name, avatar_url, headshot_url, role, title, is_section_leader, voice_part, phone, phone_number, status, disabled';

export function usePeopleDirectory(): { data: DirectoryPerson[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['people-directory'],
    queryFn: async (): Promise<DirectoryPerson[]> => {
      const { data, error } = await supabase
        .from('gw_profiles_directory')
        .select(DIRECTORY_SELECT)
        .order('full_name');

      if (error) throw error;

      return (data || [])
        .map((row) => ({
          ...row,
          is_section_leader: Boolean(row.is_section_leader),
          disabled: Boolean(row.disabled),
        }))
        .filter((person) => person.status !== 'inactive' && !person.disabled);
    },
    staleTime: 5 * 60 * 1000,
  });

  return { data: data ?? [], isLoading };
}
