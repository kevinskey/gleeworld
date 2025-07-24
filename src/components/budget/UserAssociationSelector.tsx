import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Search, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface UserAssociation {
  user: User;
  permission_type: 'view' | 'edit' | 'manage';
}

interface UserAssociationSelectorProps {
  budgetId?: string; // undefined when creating new budget
  associations: UserAssociation[];
  onAssociationsChange: (associations: UserAssociation[]) => void;
}

export const UserAssociationSelector: React.FC<UserAssociationSelectorProps> = ({
  budgetId,
  associations,
  onAssociationsChange
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Search for users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out already associated users
      const associatedUserIds = associations.map(a => a.user.id);
      const filtered = (data || []).filter(user => !associatedUserIds.includes(user.id));
      
      setAvailableUsers(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search failed",
        description: "Failed to search users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const addUserAssociation = (user: User, permissionType: 'view' | 'edit' | 'manage' = 'view') => {
    const newAssociation: UserAssociation = {
      user,
      permission_type: permissionType
    };
    
    onAssociationsChange([...associations, newAssociation]);
    setSearchQuery("");
    setAvailableUsers([]);
    setShowSearch(false);
  };

  const removeUserAssociation = (userId: string) => {
    onAssociationsChange(associations.filter(a => a.user.id !== userId));
  };

  const updatePermission = (userId: string, permissionType: 'view' | 'edit' | 'manage') => {
    onAssociationsChange(
      associations.map(a => 
        a.user.id === userId 
          ? { ...a, permission_type: permissionType }
          : a
      )
    );
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'view': return 'bg-blue-100 text-blue-800';
      case 'edit': return 'bg-green-100 text-green-800';
      case 'manage': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Associated Users
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Search */}
      {showSearch && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {loading && (
                <p className="text-sm text-muted-foreground">Searching...</p>
              )}

              {availableUsers.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{user.full_name || user.email}</p>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addUserAssociation(user)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && !loading && availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Associated Users List */}
      {associations.length > 0 && (
        <div className="space-y-2">
          {associations.map((association) => (
            <div
              key={association.user.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-sm">
                    {association.user.full_name || association.user.email}
                  </p>
                  {association.user.full_name && (
                    <p className="text-xs text-muted-foreground">{association.user.email}</p>
                  )}
                </div>
                <Badge className={getPermissionColor(association.permission_type)}>
                  {association.permission_type}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Select
                  value={association.permission_type}
                  onValueChange={(value: 'view' | 'edit' | 'manage') => 
                    updatePermission(association.user.id, value)
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                    <SelectItem value="manage">Manage</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeUserAssociation(association.user.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {associations.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users associated with this budget</p>
            <p className="text-xs">Click "Add User" to grant access to other team members</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};