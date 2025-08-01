import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface Member {
  id: string;
  full_name?: string;
  email: string;
  role?: string;
  exec_board_role?: string;
  voice_part?: string;
  class_year?: string | number;
  user_id?: string;
}

interface MemberSearchDropdownProps {
  members: Member[];
  selectedMember?: Member | null;
  onSelect: (member: Member | null) => void;
  placeholder?: string;
  emptyStateMessage?: string;
  showBadges?: boolean;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

export const MemberSearchDropdown = ({
  members,
  selectedMember,
  onSelect,
  placeholder = "Search for a member...",
  emptyStateMessage = "No members found",
  showBadges = true,
  disabled = false,
  className,
  allowClear = true
}: MemberSearchDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.voice_part?.toLowerCase().includes(searchLower) ||
      member.role?.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMemberSelect = (member: Member) => {
    onSelect(member);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm("");
  };

  const displayName = selectedMember?.full_name || selectedMember?.email || "";

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "ring-2 ring-ring ring-offset-2"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <User className="h-4 w-4 text-muted-foreground" />
            {selectedMember ? (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="font-medium truncate w-full text-left">
                  {displayName}
                </span>
                {selectedMember.email !== displayName && (
                  <span className="text-xs text-muted-foreground truncate w-full text-left">
                    {selectedMember.email}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedMember && allowClear && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members..."
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>

          {/* Members List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{emptyStateMessage}</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id || selectedMember?.user_id === member.user_id;
                  
                  return (
                    <button
                      key={member.id || member.user_id}
                      type="button"
                      onClick={() => handleMemberSelect(member)}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        "focus:outline-none transition-colors",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">
                            {member.full_name || member.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </div>
                          {showBadges && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {member.voice_part && (
                                <Badge variant="outline" className="text-xs h-5">
                                  {member.voice_part}
                                </Badge>
                              )}
                              {member.class_year && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  Class of {member.class_year}
                                </Badge>
                              )}
                              {member.exec_board_role && (
                                <Badge variant="default" className="text-xs h-5">
                                  {member.exec_board_role}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};