
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User, UserPlus } from "lucide-react";
import { QuickAddUserForm } from "./QuickAddUserForm";

interface User {
  id: string;
  full_name?: string;
  email: string;
}

interface UserSelectionSectionProps {
  users: User[];
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
  usersLoading: boolean;
  showSection: boolean;
  onRefreshUsers?: () => void;
}

export const UserSelectionSection = ({
  users,
  selectedUserId,
  onUserSelect,
  usersLoading,
  showSection,
  onRefreshUsers
}: UserSelectionSectionProps) => {
  const [showAddForm, setShowAddForm] = useState(false);

  if (!showSection) return null;

  const handleUserAdded = (newUser: { id: string; email: string; full_name?: string }) => {
    // Refresh the users list to get the actual user data
    if (onRefreshUsers) {
      onRefreshUsers();
    }
    
    setShowAddForm(false);
    
    // Select the newly added user by email (since we might not have the real ID yet)
    const existingUser = users.find(u => u.email === newUser.email);
    if (existingUser) {
      onUserSelect(existingUser.id);
    }
  };

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <Label>Select User for Contract</Label>
        <QuickAddUserForm 
          onUserAdded={handleUserAdded}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="user-select">Select User for Contract</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="h-7 px-2 text-xs"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Add User
        </Button>
      </div>
      
      <Select value={selectedUserId} onValueChange={onUserSelect} disabled={usersLoading}>
        <SelectTrigger>
          <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a registered user"} />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{user.full_name || user.email}</span>
                <span className="text-gray-500 text-sm">({user.email})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
