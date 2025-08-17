import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SetupCrew {
  id: string;
  event_id: string;
  crew_name: string;
  max_members: number;
  coordinator_id: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  event_title?: string;
  event_date?: string;
  member_count?: number;
}

export interface SetupCrewMember {
  id: string;
  crew_id: string;
  user_id: string;
  role: 'leader' | 'member';
  assigned_at: string;
  assigned_by: string;
  // Joined data
  user_name?: string;
  user_email?: string;
  voice_part?: string;
  graduation_year?: number;
}

export interface CreateCrewData {
  event_id: string;
  crew_name: string;
  max_members?: number;
  notes?: string;
}

export const useSetupCrews = () => {
  const [crews, setCrews] = useState<SetupCrew[]>([]);
  const [members, setMembers] = useState<SetupCrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCrews = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_setup_crews')
        .select(`
          *,
          events:gw_events(title, start_date)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const crewsWithMemberCount = await Promise.all(
        (data || []).map(async (crew) => {
          const { count } = await supabase
            .from('gw_setup_crew_members')
            .select('*', { count: 'exact', head: true })
            .eq('crew_id', crew.id);

          const eventData = Array.isArray(crew.events) ? crew.events[0] : crew.events;

          return {
            ...crew,
            event_title: eventData?.title,
            event_date: eventData?.start_date,
            member_count: count || 0,
          };
        })
      );

      setCrews(crewsWithMemberCount);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch setup crews: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCrewMembers = useCallback(async (crewId: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_setup_crew_members')
        .select(`
          *,
          profiles:gw_profiles(full_name, email, voice_part, graduation_year)
        `)
        .eq('crew_id', crewId)
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      const membersWithProfile = (data || []).map(member => {
        const profileData = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        
        return {
          ...member,
          role: (member.role as 'leader' | 'member') || 'member',
          user_name: profileData?.full_name || 'Unknown',
          user_email: profileData?.email,
          voice_part: profileData?.voice_part,
          graduation_year: profileData?.graduation_year,
        };
      });

      setMembers(membersWithProfile);
      return membersWithProfile;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch crew members: " + error.message,
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const createCrew = useCallback(async (data: CreateCrewData) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('gw_setup_crews')
        .insert([{
          ...data,
          coordinator_id: user.user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Setup crew created successfully",
      });

      await fetchCrews();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create setup crew: " + error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCrews, toast]);

  const addMemberToCrew = useCallback(async (crewId: string, userId: string, role: 'leader' | 'member' = 'member') => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('gw_setup_crew_members')
        .insert([{
          crew_id: crewId,
          user_id: userId,
          role,
          assigned_by: user.user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added to crew successfully",
      });

      await fetchCrewMembers(crewId);
      await fetchCrews(); // Update member count
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add member to crew: " + error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCrewMembers, fetchCrews, toast]);

  const removeMemberFromCrew = useCallback(async (memberId: string, crewId: string) => {
    try {
      const { error } = await supabase
        .from('gw_setup_crew_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed from crew successfully",
      });

      await fetchCrewMembers(crewId);
      await fetchCrews(); // Update member count
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove member from crew: " + error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCrewMembers, fetchCrews, toast]);

  const updateCrewMemberRole = useCallback(async (memberId: string, newRole: 'leader' | 'member', crewId: string) => {
    try {
      const { error } = await supabase
        .from('gw_setup_crew_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member role updated successfully",
      });

      await fetchCrewMembers(crewId);
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update member role: " + error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCrewMembers, toast]);

  const deleteCrew = useCallback(async (crewId: string) => {
    try {
      const { error } = await supabase
        .from('gw_setup_crews')
        .delete()
        .eq('id', crewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Setup crew deleted successfully",
      });

      await fetchCrews();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete setup crew: " + error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCrews, toast]);

  // Get first-year students for crew assignment
  const getFirstYearStudents = useCallback(async () => {
    try {
      const currentYear = new Date().getFullYear();
      const firstYearGradYear = currentYear + 4;

      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part, graduation_year')
        .eq('graduation_year', firstYearGradYear)
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch first-year students: " + error.message,
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  return {
    crews,
    members,
    loading,
    fetchCrews,
    fetchCrewMembers,
    createCrew,
    addMemberToCrew,
    removeMemberFromCrew,
    updateCrewMemberRole,
    deleteCrew,
    getFirstYearStudents,
  };
};