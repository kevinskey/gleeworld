
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/hooks/useUsers";
import { AlertCircle } from "lucide-react";

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) => {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [role, setRole] = useState(user?.role || "user");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!user) return;

    // Validate inputs
    if (!fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    if (!["user", "admin", "super-admin"].includes(role)) {
      toast({
        title: "Validation Error", 
        description: "Invalid role selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Updating user profile:', { userId: user.id, fullName, role });

      // Update gw_profiles which will sync to profiles via trigger
      const { error: gwProfileError } = await supabase
        .from('gw_profiles')
        .update({
          full_name: fullName.trim(),
          first_name: fullName.trim().split(' ')[0],
          last_name: fullName.trim().split(' ').slice(1).join(' ') || null,
        })
        .eq('user_id', user.id);

      if (gwProfileError) {
        console.error('GW Profile update error:', gwProfileError);
        throw new Error(`Failed to update profile: ${gwProfileError.message}`);
      }

      // Also update the profiles table role directly for admin functions
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', user.id);

      if (roleError) {
        console.error('Role update error:', roleError);
        throw new Error(`Failed to update role: ${roleError.message}`);
      }

      console.log('User profile updated successfully');

      toast({
        title: "Success",
        description: "User profile updated successfully",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setRole(user.role || "user");
    }
  }, [user]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open && user) {
      setFullName(user.full_name || "");
      setRole(user.role || "user");
    }
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Update user information and role. Email addresses cannot be changed through this interface.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Input 
                id="email" 
                value={user?.email || ""} 
                disabled 
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Email addresses are managed by Supabase Auth and cannot be changed here.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
            <strong>Note:</strong> Only profile information stored in our database can be edited here. 
            For email changes or account deletion, users must use the account settings or contact support.
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !fullName.trim()}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
