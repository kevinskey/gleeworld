import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/hooks/useUsers";
import { AlertCircle, Save, UserPlus, Loader2 } from "lucide-react";

interface UserFormProps {
  user?: User | null;
  mode: 'create' | 'edit';
  onSuccess: () => void;
  onCancel?: () => void;
}

export const UserForm = ({ user, mode, onSuccess, onCancel }: UserFormProps) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [phone, setPhone] = useState("");
  const [voicePart, setVoicePart] = useState("");
  const [execBoardRole, setExecBoardRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const { toast } = useToast();

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && user) {
      setEmail(user.email || "");
      setFullName(user.full_name || "");
      setRole(user.role || "user");
      setPhone((user as any)?.phone || "");
      setVoicePart((user as any)?.voice_part || "");
      setExecBoardRole((user as any)?.exec_board_role || "");
    }
  }, [user, mode]);

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setRole("user");
    setPhone("");
    setVoicePart("");
    setExecBoardRole("");
    setTempPassword("");
  };

  const validateForm = () => {
    if (mode === 'create' && !email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required for new users",
        variant: "destructive",
      });
      return false;
    }

    if (!fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!["user", "admin", "super-admin", "alumnae"].includes(role)) {
      toast({
        title: "Validation Error",
        description: "Please select a valid role",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    console.log('Starting user creation process...');
    setIsLoading(true);
    try {
      console.log('Calling import-users function with:', {
        email: email.trim(),
        full_name: fullName.trim(),
        role: role
      });

      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users: [{
            email: email.trim(),
            full_name: fullName.trim(),
            role: role,
            phone: phone.trim(),
            voice_part: voicePart === 'none' ? null : voicePart,
            exec_board_role: execBoardRole === 'none' ? null : execBoardRole || null
          }],
          source: 'manual'
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data.success > 0) {
        const newTempPassword = data.users?.[0]?.temp_password || "";
        setTempPassword(newTempPassword);
        
        console.log('User created successfully:', data);
        toast({
          title: "User Created Successfully",
          description: `${email} has been added to the system.`,
        });
        
        resetForm();
        onSuccess();
      } else if (data.errors && data.errors.length > 0) {
        console.error('Function returned errors:', data.errors);
        toast({
          title: "Error Creating User",
          description: data.errors[0],
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!user || !validateForm()) return;

    setIsLoading(true);
    try {
      // Update gw_profiles if exists
      const { error: gwProfileError } = await supabase
        .from('gw_profiles')
        .update({
          full_name: fullName.trim(),
          first_name: fullName.trim().split(' ')[0],
          last_name: fullName.trim().split(' ').slice(1).join(' ') || null,
          phone: phone.trim() || null,
          voice_part: voicePart || null,
          exec_board_role: execBoardRole || null,
          is_exec_board: !!execBoardRole
        })
        .eq('user_id', user.id);

      // Update profiles table role
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

      onSuccess();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      await handleCreateUser();
    } else {
      await handleEditUser();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mode === 'create' ? (
            <>
              <UserPlus className="h-5 w-5" />
              Add New User
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Edit User Profile
            </>
          )}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? "Create a new user account with the specified role and credentials."
            : "Update user information and role. Email addresses cannot be changed."
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            {mode === 'create' ? (
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isLoading}
              />
            ) : (
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
            )}
            {mode === 'edit' && (
              <p className="text-xs text-gray-500">
                Email addresses are managed by Supabase Auth and cannot be changed.
              </p>
            )}
          </div>

          {/* Full Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="alumnae">Alumnae</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isLoading}
            />
          </div>

          {/* Voice Part Field */}
          <div className="space-y-2">
            <Label htmlFor="voicePart">Voice Part/Section</Label>
            <Select value={voicePart} onValueChange={setVoicePart} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select voice part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Soprano 1">Soprano 1</SelectItem>
                <SelectItem value="Soprano 2">Soprano 2</SelectItem>
                <SelectItem value="Alto 1">Alto 1</SelectItem>
                <SelectItem value="Alto 2">Alto 2</SelectItem>
                <SelectItem value="Tenor 1">Tenor 1</SelectItem>
                <SelectItem value="Tenor 2">Tenor 2</SelectItem>
                <SelectItem value="Bass 1">Bass 1</SelectItem>
                <SelectItem value="Bass 2">Bass 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Executive Board Role Field */}
          <div className="space-y-2">
            <Label htmlFor="execBoardRole">Executive Board Position</Label>
            <Select value={execBoardRole} onValueChange={setExecBoardRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select position (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="President">President</SelectItem>
                <SelectItem value="Vice President">Vice President</SelectItem>
                <SelectItem value="Secretary">Secretary</SelectItem>
                <SelectItem value="Treasurer">Treasurer</SelectItem>
                <SelectItem value="Historian">Historian</SelectItem>
                <SelectItem value="Librarian">Librarian</SelectItem>
                <SelectItem value="Chaplain">Chaplain</SelectItem>
                <SelectItem value="Public Relations">Public Relations</SelectItem>
                <SelectItem value="Social Chair">Social Chair</SelectItem>
                <SelectItem value="Tour Manager">Tour Manager</SelectItem>
                <SelectItem value="Section Leader">Section Leader</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Temporary Password Display (Create Mode Only) */}
          {mode === 'create' && tempPassword && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Temporary Password:</strong> {tempPassword}
                <br />
                <span className="text-sm">Share this password securely with the user.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};