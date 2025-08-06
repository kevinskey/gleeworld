import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Save, UserCog, Shield, Crown, User } from 'lucide-react';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  exec_board_role?: string;
  is_exec_board?: boolean;
  verified?: boolean;
  created_at?: string;
}

interface UserRoleEditorProps {
  user: UserProfile;
  onUpdate: (updatedUser: UserProfile) => void;
}

const ROLE_OPTIONS = [
  { value: 'fan', label: 'Fan', icon: User, description: 'General public access' },
  { value: 'auditioner', label: 'Auditioner', icon: User, description: 'Auditioning for Glee Club' },
  { value: 'member', label: 'Member', icon: User, description: 'Active Glee Club member' },
  { value: 'alumna', label: 'Alumna', icon: User, description: 'Former Glee Club member' },
  { value: 'executive', label: 'Executive', icon: UserCog, description: 'Executive board member' },
  { value: 'admin', label: 'Admin', icon: Shield, description: 'Platform administrator' },
  { value: 'super-admin', label: 'Super Admin', icon: Crown, description: 'Full system access' },
];

const EXEC_BOARD_ROLES = [
  { label: 'President', value: 'president' },
  { label: 'Secretary', value: 'secretary' },
  { label: 'Treasurer', value: 'treasurer' },
  { label: 'Tour Manager', value: 'tour_manager' },
  { label: 'Librarian', value: 'librarian' },
  { label: 'Historian', value: 'historian' },
  { label: 'PR Coordinator', value: 'pr_coordinator' },
  { label: 'Chaplain', value: 'chaplain' },
  { label: 'Merchandise Manager', value: 'merchandise_manager' },
  { label: 'Data Analyst', value: 'data_analyst' },
  { label: 'Assistant Chaplain', value: 'assistant_chaplain' },
  { label: 'Fundraising Manager', value: 'fundraising_manager' },
  { label: 'Senior Representative', value: 'senior_representative' },
  { label: 'Junior Representative', value: 'junior_representative' },
  { label: 'Sophomore Representative', value: 'sophomore_representative' },
  { label: 'Freshman Representative', value: 'freshman_representative' },
  { label: 'Wardrobe Manager', value: 'wardrobe_manager' },
  { label: 'PR Manager', value: 'pr_manager' }
];

export const UserRoleEditor = ({ user, onUpdate }: UserRoleEditorProps) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    role: user.role || 'fan',
    is_exec_board: user.is_exec_board || false,
    exec_board_role: user.exec_board_role || '',
    verified: user.verified || false,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update user profile
      const { error: profileError } = await supabase
        .from('gw_profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          is_exec_board: formData.is_exec_board,
          exec_board_role: formData.is_exec_board ? formData.exec_board_role : null,
          verified: formData.verified,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Note: Executive board management will be handled separately
      // For now, we only update the profiles table with role information

      const updatedUser = {
        ...user,
        ...formData,
      };

      onUpdate(updatedUser);

      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleOption = ROLE_OPTIONS.find(option => option.value === formData.role);

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>Update user's profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={user.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed from the admin panel
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="verified"
              checked={formData.verified}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, verified: checked }))}
            />
            <Label htmlFor="verified">Verified Account</Label>
          </div>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role & Permissions</CardTitle>
          <CardDescription>Set user's primary role and access level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Primary Role</Label>
            <Select value={formData.role} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, role: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedRoleOption && (
              <p className="text-sm text-muted-foreground">
                {selectedRoleOption.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Executive Board Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Executive Board</CardTitle>
          <CardDescription>Manage executive board membership and role assignment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_exec_board"
              checked={formData.is_exec_board}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                is_exec_board: checked,
                exec_board_role: checked ? prev.exec_board_role : ''
              }))}
            />
            <Label htmlFor="is_exec_board">Executive Board Member</Label>
          </div>

          {formData.is_exec_board && (
            <div className="space-y-2">
              <Label htmlFor="exec_board_role">Executive Board Position</Label>
              <Select 
                value={formData.exec_board_role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, exec_board_role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select executive board role" />
                </SelectTrigger>
                <SelectContent>
                  {EXEC_BOARD_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.label}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Role: {formData.role}
            </Badge>
            {formData.is_exec_board && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Executive: {formData.exec_board_role}
              </Badge>
            )}
            <Badge variant={formData.verified ? "default" : "secondary"}>
              {formData.verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};