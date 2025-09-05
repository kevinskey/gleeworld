import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Users, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PhoneStats {
  totalMembers: number;
  membersWithPhone: number;
  percentage: number;
}

export const PhoneNumberStatus: React.FC<{ groupType?: string }> = ({ groupType = 'all_members' }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PhoneStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhoneStats = async () => {
      if (!user) return;

      try {
        let query = supabase.from('gw_profiles').select('phone_number, user_id');

        // Apply filtering based on group type
        switch (groupType) {
          case 'executive_board':
            query = query.eq('is_exec_board', true);
            break;
          case 'soprano_1':
            query = query.eq('voice_part', 'S1');
            break;
          case 'soprano_2':
            query = query.eq('voice_part', 'S2');
            break;
          case 'alto_1':
            query = query.eq('voice_part', 'A1');
            break;
          case 'alto_2':
            query = query.eq('voice_part', 'A2');
            break;
          case 'all_alumnae':
            query = query.eq('role', 'alumna');
            break;
          case 'all_members':
          default:
            query = query.in('role', ['member', 'executive', 'alumna', 'staff']);
            break;
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching phone stats:', error);
          return;
        }

        const totalMembers = data?.length || 0;
        const membersWithPhone = data?.filter(member => 
          member.phone_number && member.phone_number.trim().length > 0
        ).length || 0;
        
        const percentage = totalMembers > 0 ? Math.round((membersWithPhone / totalMembers) * 100) : 0;

        setStats({
          totalMembers,
          membersWithPhone,
          percentage
        });

      } catch (error) {
        console.error('Error in fetchPhoneStats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhoneStats();
  }, [user, groupType]);

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-4 w-4" />
        <span>Checking phone coverage...</span>
      </div>
    );
  }

  const isLowCoverage = stats.percentage < 70;
  const statusColor = isLowCoverage ? 'destructive' : stats.percentage > 90 ? 'default' : 'secondary';

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <span className="text-muted-foreground">
        SMS Coverage:
      </span>
      
      <Badge variant={statusColor} className="text-xs">
        {stats.membersWithPhone}/{stats.totalMembers} ({stats.percentage}%)
      </Badge>

      {isLowCoverage && (
        <div className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">Low coverage</span>
        </div>
      )}
    </div>
  );
};

export default PhoneNumberStatus;