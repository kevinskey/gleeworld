import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/hooks/useUsers";
import { 
  X, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  User as UserIcon, 
  Shield,
  Calendar,
  Mail,
  Loader2,
  Save
} from "lucide-react";

interface UserDetailPanelProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
}

export const UserDetailPanel = ({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated, 
  onUserDeleted 
}: UserDetailPanelProps) => {
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!isOpen || !user) return null;

  const expectedDeleteText = `DELETE ${user.email}`;
  const isConfirmValid = confirmText === expectedDeleteText;

  const getRoleIcon = (userRole: string) => {
    switch (userRole) {
      case 'super-admin':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'super-admin': return 'destructive';
      case 'admin': return 'default';
      case 'alumnae': return 'secondary';
      default: return 'outline';
    }
  };

  const handleEditStart = () => {
    setFullName(user.full_name || "");
    setRole(user.role || "user");
    setEditMode(true);
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setFullName("");
    setRole("");
  };

  const handleEditSave = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update gw_profiles if exists
      const { error: gwProfileError } = await supabase
        .from('gw_profiles')
        .update({
          full_name: fullName.trim(),
          first_name: fullName.trim().split(' ')[0],
          last_name: fullName.trim().split(' ').slice(1).join(' ') || null,
        })
        .eq('user_id', user.id);

      // Update profiles table
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ 
          role: role,
          full_name: fullName.trim()
        })
        .eq('id', user.id);

      if (roleError) {
        throw new Error(`Failed to update user: ${roleError.message}`);
      }

      toast({
        title: "User Updated Successfully",
        description: `${user.email} has been updated.`,
      });

      setEditMode(false);
      onUserUpdated();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user_and_data', {
        target_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: `${user.email} has been permanently deleted from the system.`,
      });

      setDeleteMode(false);
      setConfirmText("");
      onUserDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">User Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* User Profile Section */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-brand-200/50">
                    <AvatarImage 
                      src={user.avatar_url || `https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face`}
                      alt={user.full_name || user.email || "User"} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 text-lg">
                      {user.full_name ? 
                        user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                        <UserIcon className="h-8 w-8" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{user.full_name || 'No name provided'}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getRoleIcon(user.role)}
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {editMode ? (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFullName">Full Name *</Label>
                    <Input
                      id="editFullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editRole">Role *</Label>
                    <select 
                      id="editRole"
                      value={role} 
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background"
                      disabled={loading}
                    >
                      <option value="user">User</option>
                      <option value="alumnae">Alumnae</option>
                      <option value="admin">Admin</option>
                      <option value="super-admin">Super Admin</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleEditCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleEditSave}
                      disabled={loading || !fullName.trim()}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                </CardContent>
              ) : (
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditStart}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDeleteMode(true)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleIcon(user.role)}
                  <span className="text-gray-600">Role:</span>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                    {user.role}
                  </Badge>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Phone:</span>
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.voice_part && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Voice Part:</span>
                    <span className="capitalize">{user.voice_part.replace('_', ' ')}</span>
                  </div>
                )}
                {user.class_year && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Class Year:</span>
                    <span>{user.class_year}</span>
                  </div>
                )}
                {user.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {user.status.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Dues Paid:</span>
                  <Badge variant={user.dues_paid ? "default" : "destructive"} className="text-xs">
                    {user.dues_paid ? "Yes" : "No"}
                  </Badge>
                </div>
                {user.exec_board_role && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Executive Role:</span>
                    <span className="capitalize">{user.exec_board_role.replace('_', ' ')}</span>
                  </div>
                )}
                {user.notes && (
                  <div className="space-y-1">
                    <span className="text-gray-600">Notes:</span>
                    <p className="text-sm bg-gray-50 p-2 rounded">{user.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Confirmation */}
            {deleteMode && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Delete User Account
                  </CardTitle>
                  <CardDescription>
                    This action cannot be undone. This will permanently delete the user account and all associated data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Warning:</strong> This will permanently delete user profile, contracts, payments, and all associated data.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="confirmDelete">
                      Type <code className="bg-gray-100 px-1 rounded text-red-600 font-mono text-xs">{expectedDeleteText}</code> to confirm
                    </Label>
                    <Input
                      id="confirmDelete"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={expectedDeleteText}
                      className={confirmText && !isConfirmValid ? "border-red-300" : ""}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteMode(false);
                        setConfirmText("");
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={!isConfirmValid || loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};