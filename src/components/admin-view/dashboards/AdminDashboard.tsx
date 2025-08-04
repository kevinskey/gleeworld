import { useState, useEffect } from "react";
import { PermissionsGrid } from "@/components/admin/PermissionsGrid";
import { EXECUTIVE_POSITIONS, type ExecutivePosition } from "@/hooks/useExecutivePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
interface AdminDashboardProps {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

interface ExecutiveBoardMember {
  id: string;
  user_id: string;
  position: string;
  full_name: string;
  email: string;
}

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  console.log('AdminDashboard component rendering with user:', user);
  
  const [activePosition, setActivePosition] = useState<ExecutivePosition>(EXECUTIVE_POSITIONS[0]);
  const [executiveMembers, setExecutiveMembers] = useState<ExecutiveBoardMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExecutiveMembers = async () => {
      console.log('AdminDashboard: Starting to fetch executive members...');
      try {
        // Get executive board members and profiles separately, then join manually
        const { data: membersData, error: membersError } = await supabase
          .from('gw_executive_board_members')
          .select('*')
          .eq('is_active', true);

        console.log('AdminDashboard: Members data:', membersData, 'Error:', membersError);

        const { data: profilesData, error: profilesError } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email');

        console.log('AdminDashboard: Profiles data:', profilesData, 'Error:', profilesError);

        if (membersError || profilesError) {
          console.error('Error fetching data:', { membersError, profilesError });
          return;
        }

        // Create entries for ALL executive positions
        const allPositions = EXECUTIVE_POSITIONS.map(position => {
          // Find if there's a member assigned to this position
          const assignedMember = membersData?.find(member => member.position === position.value);
          
          if (assignedMember) {
            // If member found, get their profile
            const profile = profilesData?.find(p => p.user_id === assignedMember.user_id);
            return {
              id: assignedMember.id,
              user_id: assignedMember.user_id,
              position: position.value,
              full_name: profile?.full_name || profile?.email || 'Unknown Member',
              email: profile?.email || ''
            };
          } else {
            // If no member assigned, create placeholder
            return {
              id: `empty_${position.value}`,
              user_id: '',
              position: position.value,
              full_name: `${position.label} (No member assigned)`,
              email: ''
            };
          }
        });

        setExecutiveMembers(allPositions);
        
        // Set no selection by default
        setSelectedMember("");
        setActivePosition(EXECUTIVE_POSITIONS[0]);
      } catch (error) {
        console.error('Error fetching executive members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutiveMembers();
  }, []);

  const handleMemberChange = (memberId: string) => {
    setSelectedMember(memberId);
    const member = executiveMembers.find(m => m.id === memberId);
    if (member) {
      const position = EXECUTIVE_POSITIONS.find(pos => pos.value === member.position);
      if (position) {
        setActivePosition(position);
      }
    }
  };

  const shouldShowPermissionsGrid = selectedMember && !selectedMember.startsWith('empty_');

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6 -m-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading executive board members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Executive Board Permissions Management
            </h1>
            <p className="text-muted-foreground">
              Assign function permissions to executive board members
            </p>
          </div>

          <div className="w-full lg:w-80">
            <Select value={selectedMember} onValueChange={handleMemberChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select an executive board member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground italic">None</span>
                </SelectItem>
                {executiveMembers.map((member) => {
                  const position = EXECUTIVE_POSITIONS.find(pos => pos.value === member.position);
                  return (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.full_name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({position?.label || member.position})
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {shouldShowPermissionsGrid && (
          <div className="mt-6">
            <PermissionsGrid selectedPosition={activePosition} />
          </div>
        )}
      </div>
    </div>
  );
};