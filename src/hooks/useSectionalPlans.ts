import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SectionalPlan {
  id: string;
  sectionLeader: string;
  section: string;
  week: string;
  status: 'Pending Review' | 'Approved' | 'Needs Revision';
  uploadDate: string;
  focus: string;
  created_at: string;
  updated_at: string;
}

export const useSectionalPlans = () => {
  const [plans, setPlans] = useState<SectionalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      // Get section leaders and their recent activities
      const { data: sectionLeaders, error: leadersError } = await supabase
        .from('gw_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          voice_part,
          is_section_leader
        `)
        .eq('is_section_leader', true);

      if (leadersError) throw leadersError;

      // For now, create placeholder plans based on section leaders
      // In the future, these would come from a sectional_plans table
      const mockPlans: SectionalPlan[] = sectionLeaders?.map((leader, index) => ({
        id: `plan-${leader.user_id}`,
        sectionLeader: `${leader.first_name} ${leader.last_name}`,
        section: leader.voice_part || 'Soprano 1',
        week: `Week ${3 + (index % 3)}`,
        status: ['Pending Review', 'Approved', 'Needs Revision'][index % 3] as SectionalPlan['status'],
        uploadDate: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        focus: [
          'Breath control, high notes',
          'Rhythm in measures 32-48', 
          'Vowel placement',
          'Diction and consonants',
          'Blend and balance'
        ][index % 5],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })) || [];

      setPlans(mockPlans);
    } catch (error) {
      console.error('Error fetching sectional plans:', error);
      toast({
        title: "Error",
        description: "Failed to load sectional plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePlanStatus = async (planId: string, status: SectionalPlan['status']) => {
    try {
      // Update local state immediately for better UX
      setPlans(prev => prev.map(plan => 
        plan.id === planId ? { ...plan, status } : plan
      ));

      // In the future, this would update the database
      toast({
        title: "Status Updated",
        description: `Plan status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating plan status:', error);
      toast({
        title: "Error",
        description: "Failed to update plan status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    fetchPlans,
    updatePlanStatus
  };
};