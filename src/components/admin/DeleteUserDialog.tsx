import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/hooks/useUsers";

interface DeleteUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeleted?: () => void;
}

export const DeleteUserDialog = ({ user, open, onOpenChange, onUserDeleted }: DeleteUserDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const expectedText = user ? `DELETE ${user.email}` : "";

  const handleDelete = async () => {
    if (!user) return;

    if (confirmText !== expectedText) {
      toast({
        title: "Error",
        description: `Please type exactly: ${expectedText}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No valid session found");
      }

      // Call the edge function to delete user
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          userId: user.id,
          userEmail: user.email,
          confirmText: confirmText
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `User ${user.email} has been permanently deleted`,
      });

      onOpenChange(false);
      setConfirmText("");
      onUserDeleted?.();
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

  const isConfirmValid = confirmText === expectedText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete User Account</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account and all associated data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Warning:</strong> This will permanently delete:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• User profile and authentication</li>
              <li>• Module permissions and assignments</li>
              <li>• Executive board memberships</li>
              <li>• User preferences and settings</li>
              <li>• Contract associations</li>
            </ul>
          </div>

          <div>
            <Label htmlFor="email">User Email</Label>
            <Input 
              id="email" 
              value={user?.email || ""} 
              disabled 
              className="bg-gray-100"
            />
          </div>
          
          <div>
            <Label htmlFor="confirmText">
              Type <code className="bg-gray-100 px-1 rounded">{expectedText}</code> to confirm
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedText}
              className={isConfirmValid ? "border-green-500" : ""}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading || !isConfirmValid}
            className="gap-2"
          >
            {loading ? (
              "Deleting..."
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};