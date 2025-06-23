
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";

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
}

export const UserSelectionSection = ({
  users,
  selectedUserId,
  onUserSelect,
  usersLoading,
  showSection
}: UserSelectionSectionProps) => {
  if (!showSection) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="user-select">Select User for Contract</Label>
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
