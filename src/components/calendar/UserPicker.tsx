import { useState } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

interface UserPickerProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export const UserPicker = ({ selectedUserIds, onSelectionChange }: UserPickerProps) => {
  const [open, setOpen] = useState(false);
  const { users, loading } = useUsers();

  const selectedUsers = users.filter(user => selectedUserIds.includes(user.id));

  const toggleUser = (userId: string) => {
    const newSelection = selectedUserIds.includes(userId)
      ? selectedUserIds.filter(id => id !== userId)
      : [...selectedUserIds, userId];
    onSelectionChange(newSelection);
  };

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUserIds.filter(id => id !== userId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {selectedUserIds.length === 0 ? "Select users to notify..." : `${selectedUserIds.length} user(s) selected`}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading users..." : "No users found."}
              </CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.full_name || user.email || user.id}
                    onSelect={() => toggleUser(user.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedUserIds.includes(user.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.full_name || user.email}
                      </span>
                      {user.full_name && user.email && (
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeUser(user.id)}
            >
              {user.full_name || user.email}
              <span className="ml-1 text-xs">×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};