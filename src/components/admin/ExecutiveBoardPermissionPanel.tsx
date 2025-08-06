import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Crown, 
  Settings, 
  Shield, 
  Plus, 
  Edit, 
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Music,
  Plane,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExecutivePermissions } from '@/hooks/useExecutivePermissions';

interface ExecutiveBoardMember {
  user_id: string;
  full_name: string;
  email: string;
  position: string;
  academic_year: string;
  is_active: boolean;
  permissions: Array<{
    function_id: string;
    function_name: string;
    can_access: boolean;
    can_manage: boolean;
  }>;
}

const POSITION_ICONS: Record<string, any> = {
  president: Crown,
  vice_president: Shield,
  secretary: MessageSquare,
  treasurer: DollarSign,
  music_director: Music,
  tour_manager: Plane,
  social_media_manager: MessageSquare,
  public_relations: MessageSquare,
  wardrobe_manager: Settings,
  historian: BarChart3,
};

const POSITION_COLORS: Record<string, string> = {
  president: '#dc2626',
  vice_president: '#7c3aed',
  secretary: '#059669',
  treasurer: '#d97706',
  music_director: '#2563eb',
  tour_manager: '#7c2d12',
  social_media_manager: '#db2777',
  public_relations: '#0891b2',
  wardrobe_manager: '#65a30d',
  historian: '#4338ca',
};

// Position-specific permission templates
const POSITION_PERMISSION_TEMPLATES: Record<string, string[]> = {
  president: [
    'manage_executive_board',
    'approve_budgets',
    'manage_contracts',
    'approve_events',
    'manage_communications',
    'access_all_reports'
  ],
  vice_president: [
    'assist_president',
    'manage_meetings',
    'coordinate_events',
    'manage_communications'
  ],
  secretary: [
    'manage_meeting_minutes',
    'manage_communications',
    'schedule_meetings',
    'maintain_records'
  ],
  treasurer: [
    'manage_finances',
    'approve_payments',
    'manage_budgets',
    'financial_reporting',
    'manage_contracts'
  ],
  music_director: [
    'manage_music_library',
    'schedule_rehearsals',
    'manage_performances',
    'select_repertoire'
  ],
  tour_manager: [
    'manage_tours',
    'book_venues',
    'coordinate_travel',
    'manage_logistics',
    'handle_contracts'
  ],
  social_media_manager: [
    'manage_social_media',
    'create_content',
    'manage_communications',
    'track_engagement'
  ],
  public_relations: [
    'manage_press_relations',
    'coordinate_publicity',
    'manage_communications',
    'organize_events'
  ],
  wardrobe_manager: [
    'manage_wardrobe',
    'coordinate_fittings',
    'maintain_inventory',
    'plan_costumes'
  ],
  historian: [
    'maintain_archives',
    'document_events',
    'manage_media',
    'create_reports'
  ]
};

const ExecutiveBoardMemberCard = ({ 
  member, 
  onEdit 
}: { 
  member: ExecutiveBoardMember;
  onEdit: (member: ExecutiveBoardMember) => void;
}) => {
  const IconComponent = POSITION_ICONS[member.position] || Users;
  const positionColor = POSITION_COLORS[member.position] || '#6366f1';
  
  const accessCount = member.permissions.filter(p => p.can_access).length;
  const manageCount = member.permissions.filter(p => p.can_manage).length;

  return (
    <Card className="relative overflow-hidden">
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: positionColor }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${positionColor}20` }}
            >
              <IconComponent 
                className="w-5 h-5" 
                style={{ color: positionColor }}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{member.full_name}</CardTitle>
              <CardDescription>
                {member.position.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </CardDescription>
            </div>
          </div>
          <Badge variant={member.is_active ? "default" : "secondary"}>
            {member.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {member.email}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>{accessCount} Access</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="w-4 h-4 text-green-600" />
              <span>{manageCount} Manage</span>
            </div>
          </div>
          <span className="text-muted-foreground">{member.academic_year}</span>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onEdit(member)}
            className="flex-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit Permissions
          </Button>
          <Button size="sm" variant="outline">
            <Eye className="w-3 h-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const PermissionEditDialog = ({ 
  member, 
  open, 
  onOpenChange 
}: {
  member: ExecutiveBoardMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [permissions, setPermissions] = useState<Record<string, { access: boolean; manage: boolean }>>({});
  const { appFunctions, updatePermission } = useExecutivePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      const permissionMap: Record<string, { access: boolean; manage: boolean }> = {};
      member.permissions.forEach(p => {
        permissionMap[p.function_id] = {
          access: p.can_access,
          manage: p.can_manage
        };
      });
      setPermissions(permissionMap);
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;

    try {
      const updates = Object.entries(permissions).map(([functionId, perms]) => 
        updatePermission(member.position as any, functionId, 'can_access', perms.access)
          .then(() => updatePermission(member.position as any, functionId, 'can_manage', perms.manage))
      );

      await Promise.all(updates);
      
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
      
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating permissions:', err);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = () => {
    if (!member) return;
    
    const template = POSITION_PERMISSION_TEMPLATES[member.position] || [];
    const newPermissions = { ...permissions };
    
    // Reset all permissions
    appFunctions.forEach(func => {
      newPermissions[func.id] = { access: false, manage: false };
    });
    
    // Apply template
    template.forEach(functionId => {
      if (newPermissions[functionId]) {
        newPermissions[functionId] = { access: true, manage: true };
      }
    });
    
    setPermissions(newPermissions);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Permissions for {member.full_name}</DialogTitle>
          <DialogDescription>
            Configure access and management permissions for {member.position.replace('_', ' ')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={applyTemplate}>
            Apply Position Template
          </Button>
          <Button variant="outline" onClick={() => setPermissions({})}>
            Clear All
          </Button>
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-4">
            {appFunctions.map((func) => {
              const permission = permissions[func.id] || { access: false, manage: false };
              return (
                <div key={func.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{func.name}</h4>
                    <p className="text-sm text-muted-foreground">{func.description}</p>
                    <Badge variant="outline" className="mt-1">{func.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${func.id}-access`}
                        checked={permission.access}
                        onCheckedChange={(checked) => 
                          setPermissions(prev => ({
                            ...prev,
                            [func.id]: { ...prev[func.id], access: !!checked }
                          }))
                        }
                      />
                      <Label htmlFor={`${func.id}-access`} className="text-sm">
                        Access
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${func.id}-manage`}
                        checked={permission.manage}
                        onCheckedChange={(checked) => 
                          setPermissions(prev => ({
                            ...prev,
                            [func.id]: { ...prev[func.id], manage: !!checked }
                          }))
                        }
                      />
                      <Label htmlFor={`${func.id}-manage`} className="text-sm">
                        Manage
                      </Label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ExecutiveBoardPermissionPanel = () => {
  const [members, setMembers] = useState<ExecutiveBoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<ExecutiveBoardMember | null>(null);
  const { toast } = useToast();

  const fetchExecutiveMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch executive board members with their profiles
      const { data: execMembers, error: execError } = await supabase
        .from('gw_executive_board_members')
        .select(`
          user_id,
          position,
          academic_year,
          is_active,
          gw_profiles!inner (
            full_name,
            email
          )
        `)
        .eq('is_active', true);

      if (execError) throw execError;

      // Fetch permissions for each member
      const membersWithPermissions = await Promise.all(
        (execMembers || []).map(async (member: any) => {
          const { data: permissions } = await supabase
            .from('gw_executive_position_functions')
            .select(`
              function_id,
              can_access,
              can_manage,
              gw_app_functions (
                name
              )
            `)
            .eq('position', member.position);

          return {
            user_id: member.user_id,
            full_name: member.gw_profiles.full_name,
            email: member.gw_profiles.email,
            position: member.position,
            academic_year: member.academic_year,
            is_active: member.is_active,
            permissions: (permissions || []).map((p: any) => ({
              function_id: p.function_id,
              function_name: p.gw_app_functions?.name || p.function_id,
              can_access: p.can_access,
              can_manage: p.can_manage
            }))
          };
        })
      );

      setMembers(membersWithPermissions);
    } catch (err) {
      console.error('Error fetching executive members:', err);
      toast({
        title: "Error",
        description: "Failed to fetch executive board members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveMembers();
  }, []);

  const stats = {
    totalMembers: members.length,
    activeMembers: members.filter(m => m.is_active).length,
    totalPermissions: members.reduce((sum, m) => sum + m.permissions.length, 0),
    avgPermissions: members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.permissions.filter(p => p.can_access).length, 0) / members.length) : 0
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Per Member</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPermissions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Executive Board Permission Management
          </CardTitle>
          <CardDescription>
            Manage permissions for executive board members and their administrative functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading executive board members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No executive board members found
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <ExecutiveBoardMemberCard
                  key={member.user_id}
                  member={member}
                  onEdit={setEditingMember}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Edit Dialog */}
      <PermissionEditDialog
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      />
    </div>
  );
};