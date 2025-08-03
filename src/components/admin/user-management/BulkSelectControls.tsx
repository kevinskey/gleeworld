import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User } from "@/hooks/useUsers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CheckSquare, Square, Settings } from "lucide-react";

interface BulkSelectControlsProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkActionComplete: () => void;
}

export const BulkSelectControls = ({
  users,
  selectedUsers,
  onSelectionChange,
  onBulkActionComplete,
}: BulkSelectControlsProps) => {
  const [bulkRole, setBulkRole] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(users.map(user => user.id));
    } else {
      onSelectionChange([]);
    }
  };

  const { user } = useAuth();

  const handleBulkRoleUpdate = async () => {
    if (!bulkRole || selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select users and a role",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL SECURITY CHECK: Prevent self-privilege escalation
    if (user && selectedUsers.includes(user.id)) {
      toast({
        title: "Security Error",
        description: "You cannot modify your own role. Please ask another administrator to make this change.",
        variant: "destructive",
      });
      return;
    }

    // Additional validation: Check if trying to escalate to admin/super-admin roles
    if ((bulkRole === 'admin' || bulkRole === 'super-admin') && selectedUsers.length > 1) {
      toast({
        title: "Warning",
        description: "Admin and Super Admin roles should be assigned individually for security reasons.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Use the new secure bulk function
      const { data: bulkResult, error: secureUpdateError } = await supabase.rpc('secure_bulk_update_user_roles', {
        target_user_ids: selectedUsers,
        new_role: bulkRole,
        reason: `Bulk role update to ${bulkRole}`
      });

      if (secureUpdateError) {
        throw new Error(`Security function error: ${secureUpdateError.message}`);
      }

      // Check if the bulk operation was successful
      if (bulkResult && typeof bulkResult === 'object' && 'success' in bulkResult) {
        const result = bulkResult as { success: boolean; updated_count: number; errors?: Array<{ error: string }> };
        if (result.success) {
          toast({
            title: "Success",
            description: `Updated ${result.updated_count} user(s) to ${bulkRole} role`,
          });
        } else {
          throw new Error(result.errors?.[0]?.error || 'Bulk update failed');
        }
      } else {
        throw new Error('Invalid response from bulk update function');
      }

      onBulkActionComplete();
      onSelectionChange([]);
      setBulkRole("");
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user roles",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isSomeSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="border-2"
              />
              <span className="text-sm font-medium">
                {isAllSelected ? "Deselect All" : "Select All"}
              </span>
            </div>
            
            {selectedUsers.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {selectedUsers.length} selected
              </Badge>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-3">
              <Select value={bulkRole} onValueChange={setBulkRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleBulkRoleUpdate}
                disabled={!bulkRole || isUpdating}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {isUpdating ? "Updating..." : "Update Roles"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};