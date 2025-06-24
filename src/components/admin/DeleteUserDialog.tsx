
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/hooks/useUsers";
import { AlertTriangle } from "lucide-react";

interface DeleteUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeleted: () => void;
}

export const DeleteUserDialog = ({ user, open, onOpenChange, onUserDeleted }: DeleteUserDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!user) return;

    if (confirmText !== "DELETE") {
      toast({
        title: "Confirmation Required",
        description: 'Please type "DELETE" to confirm',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Deleting user:', user.id);

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Error deleting user:', error);
        throw new Error(error.message || 'Failed to delete user');
      }

      console.log('User deleted successfully');

      toast({
        title: "Success",
        description: "User and all associated data have been permanently deleted",
      });

      onUserDeleted();
      onOpenChange(false);
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

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription className="text-left">
            This action cannot be undone. This will permanently delete the user account and remove all associated data including:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-md">
            <div className="text-sm text-red-800">
              <strong>The following data will be permanently deleted:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>User profile and account</li>
                <li>All contracts created by this user</li>
                <li>All W9 forms submitted by this user</li>
                <li>All contract signatures and assignments</li>
                <li>All events created by this user</li>
                <li>All activity logs</li>
                <li>All other associated data</li>
              </ul>
            </div>
          </div>

          {user && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm"><strong>User:</strong> {user.full_name || 'No name set'}</p>
              <p className="text-sm"><strong>Email:</strong> {user.email}</p>
              <p className="text-sm"><strong>Role:</strong> {user.role}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Type <strong>"DELETE"</strong> to confirm deletion
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete} 
            disabled={loading || confirmText !== "DELETE"}
          >
            {loading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
