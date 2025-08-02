
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuickAddUserFormProps {
  onUserAdded: (user: { id: string; email: string; full_name?: string }) => void;
  onCancel: () => void;
}

export const QuickAddUserForm = ({ onUserAdded, onCancel }: QuickAddUserFormProps) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddUser = async () => {
    if (!email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an email address",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users: [{
            email: email.trim(),
            full_name: fullName.trim() || null,
            role: role
          }],
          source: 'quick_add'
        }
      });

      if (error) {
        console.error('Error adding user:', error);
        toast({
          title: "Error",
          description: "Failed to add user. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.details || data.error,
          variant: "destructive",
        });
        return;
      }

      // Success - notify parent and reset form
      toast({
        title: "Success",
        description: `User ${email} added successfully`,
      });

      onUserAdded({
        id: 'temp-id', // The actual ID will be fetched when users list refreshes
        email: email.trim(),
        full_name: fullName.trim() || undefined
      });

      // Reset form
      setEmail("");
      setFullName("");
      setRole("user");
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: "Failed to add user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Quick Add User</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Add a new user to send contracts to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="quick-email" className="text-xs">Email *</Label>
            <Input
              id="quick-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-name" className="text-xs">Full Name</Label>
            <Input
              id="quick-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="h-8 text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="fan">Fan</SelectItem>
              <SelectItem value="alumnae">Alumnae</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super-admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleAddUser}
            disabled={isAdding || !email.trim()}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-1" />
                Add User
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
