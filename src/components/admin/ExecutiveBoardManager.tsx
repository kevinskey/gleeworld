import { useState, useEffect } from "react";
import { ExecutivePrimaryTabManager } from "./ExecutivePrimaryTabManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Users, 
  Crown, 
  Calendar as CalendarIcon,
  Search,
  Plus,
  X,
  Award,
  Shield,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/hooks/useUsers";
import { 
  EXECUTIVE_BOARD_ROLES, 
  ROLE_DISPLAY_NAMES, 
  ROLE_RESPONSIBILITIES,
  ROLE_QUICK_ACTIONS,
  ExecutiveBoardRole 
} from "@/constants/executiveBoardRoles";
import { supabase } from "@/integrations/supabase/client";

interface ExecutiveBoardManager {
  users: User[];
  loading: boolean;
  onRefetch: () => void;
}

interface BoardMember {
  id?: string;
  user_id: string;
  email: string;
  full_name: string;
  exec_board_role: string;
  term_start?: string;
  term_end?: string;
}

export const ExecutiveBoardManager = ({ users, loading, onRefetch }: ExecutiveBoardManager) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<ExecutiveBoardRole | "">("");
  const [termStart, setTermStart] = useState<Date>();
  const [termEnd, setTermEnd] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [updating, setUpdating] = useState(false);
  const [isCurrentBoardCollapsed, setIsCurrentBoardCollapsed] = useState(false);

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentBoardMembers = boardMembers.filter(member => 
    member.exec_board_role && member.exec_board_role.trim() !== ''
  );

  const fetchBoardMembers = async () => {
    try {
      // Fetch from both gw_profiles and gw_executive_board_members for complete data
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('id, user_id, email, full_name, exec_board_role')
        .not('exec_board_role', 'is', null)
        .neq('exec_board_role', '');

      if (profileError) throw profileError;

      const { data: boardData, error: boardError } = await supabase
        .from('gw_executive_board_members')
        .select('user_id, position, is_active')
        .eq('is_active', true);

      if (boardError) {
        console.warn('Could not fetch from gw_executive_board_members:', boardError);
      }

      console.log('Profile data:', profileData);
      console.log('Board data:', boardData);
      
      setBoardMembers(profileData || []);
    } catch (err) {
      console.error('Error fetching board members:', err);
    }
  };

  useEffect(() => {
    fetchBoardMembers();
  }, []);

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please select both a user and a role",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      console.log('Assigning role:', selectedRole, 'to user:', selectedUser.id);
      console.log('Current user auth.uid():', await supabase.auth.getUser());
      
      const updates: any = {
        exec_board_role: selectedRole,
        is_exec_board: true,
      };

      // President gets admin privileges (since chief-of-staff doesn't exist in enum)
      if (selectedRole === 'president') {
        updates.is_admin = true;
      }

      // Update gw_profiles table
      const { error: gwProfileError } = await supabase
        .from('gw_profiles')
        .update(updates)
        .eq('user_id', selectedUser.id);

      if (gwProfileError) throw gwProfileError;

      // Also update profiles table for backward compatibility
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          exec_board_role: selectedRole,
          is_exec_board: true,
        } as any)
        .eq('id', selectedUser.id);

      if (profileError) {
        console.warn('Profile table update failed (may not exist):', profileError);
      }

      // Convert role name to match database enum (replace dashes with underscores and filter valid roles)
      const validEnumRoles = [
        'president', 'secretary', 'treasurer', 'tour_manager', 'wardrobe_manager', 
        'librarian', 'historian', 'pr_coordinator', 'chaplain', 'data_analyst', 
        'assistant_chaplain', 'student_conductor', 'section_leader_s1', 'section_leader_s2', 
        'section_leader_a1', 'section_leader_a2'
      ];
      
      const dbRoleName = selectedRole.replace(/-/g, '_');
      
      // Add/update in gw_executive_board_members table only if role exists in enum
      if (validEnumRoles.includes(dbRoleName)) {
        const { error: boardMemberError } = await supabase
          .from('gw_executive_board_members')
          .upsert({
            user_id: selectedUser.id,
            position: dbRoleName as any,
            is_active: true,
            academic_year: new Date().getFullYear().toString(),
            appointed_date: new Date().toISOString().split('T')[0],
          });

        if (boardMemberError) {
          console.warn('Board member table update failed:', boardMemberError);
        }
      } else {
        console.warn(`Role ${selectedRole} (${dbRoleName}) not found in database enum, skipping board member table update`);
      }

      toast({
        title: "Role Assigned",
        description: `${selectedUser.full_name || selectedUser.email} has been assigned as ${ROLE_DISPLAY_NAMES[selectedRole]}${selectedRole === 'president' ? ' with admin privileges' : ''}`,
      });

      // Reset form
      setSelectedUser(null);
      setSelectedRole("");
      setTermStart(undefined);
      setTermEnd(undefined);
      setNotes("");
      
      onRefetch();
      fetchBoardMembers();
    } catch (err: any) {
      console.error('Error assigning role:', err);
      toast({
        title: "Error",
        description: "Failed to assign executive board role",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveRole = async (userId: string, userName: string) => {
    setUpdating(true);
    try {
      console.log('Attempting to remove role for user:', userId, userName);
      
      // Get current role to check if removing admin privileges
      const { data: currentProfile } = await supabase
        .from('gw_profiles')
        .select('exec_board_role')
        .eq('user_id', userId)
        .single();

      const wasPresident = currentProfile?.exec_board_role === 'president';
      
      // Update gw_profiles table
      const updateData: any = {
        exec_board_role: null,
        is_exec_board: false,
      };

      // Remove admin privileges if they were President
      if (wasPresident) {
        updateData.is_admin = false;
      }

      const { error: gwProfileError } = await supabase
        .from('gw_profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (gwProfileError) throw gwProfileError;

      // Remove from gw_executive_board_members table if exists
      const { error: boardMemberError } = await supabase
        .from('gw_executive_board_members')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (boardMemberError) {
        console.error('Board member deactivation error:', boardMemberError);
        // Don't throw here as it might not exist
      }

      console.log('Successfully removed executive board role');

      toast({
        title: "Role Removed",
        description: `${userName} has been removed from the executive board`,
      });

      onRefetch();
      fetchBoardMembers();
    } catch (err: any) {
      console.error('Error removing role:', err);
      toast({
        title: "Error",
        description: `Failed to remove executive board role: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: ExecutiveBoardRole, userName: string) => {
    setUpdating(true);
    try {
      console.log('Changing role for user:', userId, 'to:', newRole);
      
      // Get current role to check admin privilege changes
      const { data: currentProfile } = await supabase
        .from('gw_profiles')
        .select('exec_board_role')
        .eq('user_id', userId)
        .single();

      const wasPresident = currentProfile?.exec_board_role === 'president';
      const willBePresident = newRole === 'president';
      
      const updates: any = {
        exec_board_role: newRole,
        is_exec_board: true,
      };

      // Handle admin privileges
      if (willBePresident && !wasPresident) {
        updates.is_admin = true;
      } else if (wasPresident && !willBePresident) {
        updates.is_admin = false;
      }

      // Update gw_profiles table
      const { error: gwProfileError } = await supabase
        .from('gw_profiles')
        .update(updates)
        .eq('user_id', userId);

      if (gwProfileError) throw gwProfileError;

      // Also update profiles table for backward compatibility
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          exec_board_role: newRole,
          is_exec_board: true,
        } as any)
        .eq('id', userId);

      if (profileError) {
        console.warn('Profile table update failed (may not exist):', profileError);
      }

      // Convert role name to match database enum
      const validEnumRoles = [
        'president', 'secretary', 'treasurer', 'tour_manager', 'wardrobe_manager', 
        'librarian', 'historian', 'pr_coordinator', 'chaplain', 'data_analyst', 
        'assistant_chaplain', 'student_conductor', 'section_leader_s1', 'section_leader_s2', 
        'section_leader_a1', 'section_leader_a2'
      ];
      
      const dbRoleName = newRole.replace(/-/g, '_');
      
      // Update in gw_executive_board_members table only if role exists in enum
      if (validEnumRoles.includes(dbRoleName)) {
        const { error: boardMemberError } = await supabase
          .from('gw_executive_board_members')
          .upsert({
            user_id: userId,
            position: dbRoleName as any,
            is_active: true,
            academic_year: new Date().getFullYear().toString(),
            appointed_date: new Date().toISOString().split('T')[0],
          });

        if (boardMemberError) {
          console.warn('Board member table update failed:', boardMemberError);
        }
      } else {
        console.warn(`Role ${newRole} (${dbRoleName}) not found in database enum, skipping board member table update`);
      }

      toast({
        title: "Role Changed",
        description: `${userName} has been changed to ${ROLE_DISPLAY_NAMES[newRole]}${willBePresident ? ' with admin privileges' : ''}${wasPresident && !willBePresident ? ' (admin privileges removed)' : ''}`,
      });

      onRefetch();
      fetchBoardMembers();
    } catch (err: any) {
      console.error('Error changing role:', err);
      toast({
        title: "Error",
        description: `Failed to change executive board role: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      'president': 'bg-purple-100 text-purple-800 border-purple-200',
      'vice-president': 'bg-blue-100 text-blue-800 border-blue-200',
      'treasurer': 'bg-green-100 text-green-800 border-green-200',
      'secretary': 'bg-orange-100 text-orange-800 border-orange-200',
      'music-director': 'bg-pink-100 text-pink-800 border-pink-200',
      'assistant-music-director': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'president') return <Crown className="h-4 w-4" />;
    if (role === 'treasurer') return <Award className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Current Executive Board */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Current Executive Board</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCurrentBoardCollapsed(!isCurrentBoardCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCurrentBoardCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CardDescription>
            Active executive board members and their roles
          </CardDescription>
        </CardHeader>
        {!isCurrentBoardCollapsed && (
          <CardContent>
            {currentBoardMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No executive board members assigned</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentBoardMembers.map((member) => {
                  const role = member.exec_board_role as ExecutiveBoardRole;
                  const quickActions = ROLE_QUICK_ACTIONS[role] || [];
                  
                  return (
                    <div 
                      key={member.id || member.user_id} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          <div>
                            <div className="font-medium">
                              {member.full_name || member.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                        <Badge className={getRoleColor(role)}>
                          {ROLE_DISPLAY_NAMES[role]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-500">
                          {quickActions.length} quick actions available
                        </div>
                        <Select 
                          value={role} 
                          onValueChange={(newRole) => handleChangeRole(member.user_id, newRole as ExecutiveBoardRole, member.full_name || member.email)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border shadow-lg z-50">
                            {Object.entries(ROLE_DISPLAY_NAMES).map(([value, label]) => {
                              const isOccupiedByOther = currentBoardMembers.some(
                                otherMember => otherMember.exec_board_role === value && otherMember.user_id !== member.user_id
                              );
                              
                              return (
                                <SelectItem 
                                  key={value} 
                                  value={value}
                                  disabled={isOccupiedByOther}
                                  className="bg-white hover:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2">
                                    {getRoleIcon(value)}
                                    <span>{label}</span>
                                    {value === 'president' && <Badge variant="outline" className="text-xs">Admin Access</Badge>}
                                    {isOccupiedByOther && <Badge variant="secondary">Occupied</Badge>}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRole(member.user_id, member.full_name || member.email)}
                          disabled={updating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Assign New Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Assign Executive Board Role
          </CardTitle>
          <CardDescription>
            Assign executive board positions to club members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Search */}
          <div className="space-y-2">
            <Label>Select Member</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0",
                      selectedUser?.id === user.id && "bg-blue-50"
                    )}
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium">{user.full_name || user.email}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.exec_board_role && (
                      <Badge variant="secondary" className="mt-1">
                        Currently: {ROLE_DISPLAY_NAMES[user.exec_board_role as ExecutiveBoardRole]}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedUser.full_name || selectedUser.email}</div>
                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Executive Board Role</Label>
            <Select 
              value={selectedRole} 
              onValueChange={(value) => setSelectedRole(value as ExecutiveBoardRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg z-50">
                {Object.entries(ROLE_DISPLAY_NAMES).map(([value, label]) => {
                  const isOccupied = currentBoardMembers.some(
                    member => member.exec_board_role === value && member.user_id !== selectedUser?.id
                  );
                  
                  return (
                    <SelectItem 
                      key={value} 
                      value={value}
                      disabled={isOccupied}
                      className="bg-white hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        {getRoleIcon(value)}
                        <span>{label}</span>
                        {value === 'president' && <Badge variant="outline" className="text-xs">Admin Access</Badge>}
                        {isOccupied && <Badge variant="secondary">Occupied</Badge>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedRole && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <strong>Responsibilities:</strong> {ROLE_RESPONSIBILITIES[selectedRole]}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleAssignRole}
              disabled={!selectedUser || !selectedRole || updating}
              className="flex items-center gap-2"
            >
              {updating ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Assign Role
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUser(null);
                setSelectedRole("");
                setSearchTerm("");
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Board Roles Reference</CardTitle>
          <CardDescription>
            Overview of all available executive board positions and their responsibilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(ROLE_DISPLAY_NAMES).map(([value, label]) => {
              const quickActions = ROLE_QUICK_ACTIONS[value as ExecutiveBoardRole] || [];
              const isOccupied = currentBoardMembers.some(member => member.exec_board_role === value);
              
              return (
                <div key={value} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(value)}
                      <h4 className="font-medium">{label}</h4>
                    </div>
                    {isOccupied ? (
                      <Badge className="bg-green-100 text-green-800">Filled</Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {ROLE_RESPONSIBILITIES[value as ExecutiveBoardRole]}
                  </p>
                  <div className="text-xs text-gray-500">
                    <strong>Quick Actions:</strong>
                    <ul className="mt-1">
                      {quickActions.slice(0, 3).map((action, idx) => (
                        <li key={idx}>• {action.label}</li>
                      ))}
                      {quickActions.length > 3 && (
                        <li>• +{quickActions.length - 3} more...</li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Primary Tab Management */}
      <ExecutivePrimaryTabManager />
    </div>
  );
};