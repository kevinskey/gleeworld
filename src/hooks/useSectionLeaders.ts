import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SectionLeader {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  voice_part: string;
  exec_board_role: string;
  is_section_leader: boolean;
  avatar_url?: string;
  phone_number?: string;
  last_sectional_date?: string;
  section_members_count?: number;
  attendance_rate?: number;
}

export interface SectionLeaderStats {
  totalSectionLeaders: number;
  activeSectionals: number;
  averageAttendance: number;
  pendingPlans: number;
}

export const useSectionLeaders = () => {
  const [sectionLeaders, setSectionLeaders] = useState<SectionLeader[]>([]);
  const [stats, setStats] = useState<SectionLeaderStats>({
    totalSectionLeaders: 0,
    activeSectionals: 0,
    averageAttendance: 0,
    pendingPlans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSectionLeaders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch section leaders from executive board members and profiles
      const { data: leaders, error: leadersError } = await supabase
        .from('gw_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          voice_part,
          exec_board_role,
          is_section_leader,
          avatar_url,
          phone_number
        `)
        .or('is_section_leader.eq.true,exec_board_role.like.%section_leader%')
        .eq('status', 'active')
        .order('voice_part', { ascending: true });

      if (leadersError) {
        throw leadersError;
      }

      // Process the data to add additional stats
      const processedLeaders: SectionLeader[] = leaders?.map(leader => ({
        ...leader,
        // Mock data for now - you can fetch from actual sectional records later
        last_sectional_date: getRandomRecentDate(),
        section_members_count: getRandomMemberCount(leader.voice_part),
        attendance_rate: getRandomAttendanceRate()
      })) || [];

      setSectionLeaders(processedLeaders);

      // Calculate stats
      const totalLeaders = processedLeaders.length;
      const avgAttendance = processedLeaders.reduce((sum, leader) => 
        sum + (leader.attendance_rate || 0), 0) / totalLeaders || 0;

      setStats({
        totalSectionLeaders: totalLeaders,
        activeSectionals: Math.floor(totalLeaders * 0.8), // Mock: 80% have active sectionals
        averageAttendance: Math.round(avgAttendance),
        pendingPlans: Math.floor(totalLeaders * 0.3) // Mock: 30% have pending plans
      });

    } catch (err) {
      console.error('Error fetching section leaders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch section leaders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectionLeaders();
  }, []);

  return {
    sectionLeaders,
    stats,
    loading,
    error,
    refetch: fetchSectionLeaders
  };
};

// Helper functions for mock data - replace with real data fetching later
const getRandomRecentDate = (): string => {
  const dates = [
    '2024-01-24',
    '2024-01-23', 
    '2024-01-22',
    '2024-01-21',
    '2024-01-20'
  ];
  return dates[Math.floor(Math.random() * dates.length)];
};

const getRandomMemberCount = (voicePart: string): number => {
  const baseCounts = {
    'S1': 15,
    'S2': 12,
    'A1': 18,
    'A2': 16,
    'Soprano': 15,
    'Alto': 18
  };
  
  const baseCount = baseCounts[voicePart as keyof typeof baseCounts] || 14;
  return baseCount + Math.floor(Math.random() * 6) - 3; // +/- 3 variance
};

const getRandomAttendanceRate = (): number => {
  return Math.floor(Math.random() * 15) + 85; // 85-100% range
};