import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  UserPlus, 
  Upload, 
  Download, 
  MoreHorizontal,
  RefreshCw,
  SortAsc,
  SortDesc,
  Users
} from "lucide-react";

interface UserActionBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onCreateUser: () => void;
  onBulkOperations: () => void;
  onRefresh: () => void;
  userCount: number;
  filteredCount: number;
  loading?: boolean;
}

export const UserActionBar = ({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onCreateUser,
  onBulkOperations,
  onRefresh,
  userCount,
  filteredCount,
  loading = false
}: UserActionBarProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getRoleCount = (role: string) => {
    // This would be calculated from the actual user data
    return 0; // Placeholder
  };

  return (
    <Card className="border-b">
      <CardContent className="p-4 space-y-4">
        {/* Top Row - Title and Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-600">
                {filteredCount === userCount 
                  ? `${userCount} total users`
                  : `${filteredCount} of ${userCount} users`
                }
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-center gap-2">
          <Button onClick={onCreateUser} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onBulkOperations}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Operations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search and Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="member">Members</SelectItem>
              <SelectItem value="fan">Fans</SelectItem>
              <SelectItem value="alumnae">Alumnae</SelectItem>
              <SelectItem value="executive-board">Executive Board</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="super-admin">Super Admins</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="full_name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="role">Role</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="w-full sm:w-auto"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4 mr-2" />
            ) : (
              <SortDesc className="h-4 w-4 mr-2" />
            )}
            Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </Button>
        </div>

        {/* Filter Summary */}
        {(searchTerm || roleFilter !== 'all') && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Search: "{searchTerm}"
              </Badge>
            )}
            {roleFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Role: {roleFilter}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onRoleFilterChange("all");
              }}
              className="text-gray-500 hover:text-gray-700 h-6 px-2 text-xs"
            >
              Clear filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};