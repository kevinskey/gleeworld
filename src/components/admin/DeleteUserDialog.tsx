
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/hooks/useUsers";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

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

  const expectedText = `DELETE ${user?.email}`;
  const isConfirmValid = confirmText === expectedText;

  const handleDelete = async () => {
    if (!user || !isConfirmValid) return;

    setLoading(true);
    try {
      console.log('Deleting user:', user.id);

      // Call the delete function
      const { error } = await supabase.rpc('delete_user_and_data', {
        target_user_id: user.id
      });

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      console.log('User deleted successfully');

      toast({
        title: "User Deleted",
        description: `${user.email} has been permanently deleted from the system.`,
      });

      setConfirmText("");
      onOpenChange(false);
      onUserDeleted();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmText("");
      onOpenChange(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account and all associated data.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Warning:</strong> This will permanently delete:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>User profile and account</li>
              <li>All contracts created by or assigned to this user</li>
              <li>All W9 forms and signatures</li>
              <li>All payments and financial records</li>
              <li>All activity logs and notifications</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">User Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {user.full_name || 'Not provided'}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Type <code className="bg-gray-100 px-1 rounded text-red-600 font-mono text-sm">{expectedText}</code> to confirm deletion
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedText}
              className={confirmText && !isConfirmValid ? "border-red-300 focus:border-red-500" : ""}
              disabled={loading}
            />
            {confirmText && !isConfirmValid && (
              <p className="text-sm text-red-600">Please type the exact text to confirm deletion.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
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
                Delete User Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
