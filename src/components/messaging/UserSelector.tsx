import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserPlus, UserMinus, MessageCircle, Users, Filter } from 'lucide-react';
import { useGroupMembers, useAddGroupMember, useRemoveGroupMember, useCreateDirectMessage } from '@/hooks/useMessaging';

interface UserSelectorProps {
  groupId?: string;
  onSelectUser?: (userId: string) => void;
  showDirectMessage?: boolean;
}

interface UserProfile {
  user_id: string;
  full_name?: string;
  email: string;
  avatar_url?: string;
  role?: string;
  voice_part?: string;
  graduation_year?: number;
  academic_year?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ 
  groupId, 
  onSelectUser,
  showDirectMessage = true 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterVoicePart, setFilterVoicePart] = useState<string>('all');
  const [filterGradYear, setFilterGradYear] = useState<string>('all');
  const [selectionMode, setSelectionMode] = useState<'individual' | 'bulk'>('individual');
  
  const { data: groupMembers } = useGroupMembers(groupId);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const createDirectMessage = useCreateDirectMessage();

  // Fetch all users with additional profile data
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['all-users-detailed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, avatar_url, role, voice_part, graduation_year, academic_year')
        .order('full_name');

      if (error) throw error;
      return data as UserProfile[];
    }
  });

  // Get unique values for filters
  const uniqueRoles = [...new Set(allUsers?.map(u => u.role).filter(Boolean))];
  const uniqueVoiceParts = [...new Set(allUsers?.map(u => u.voice_part).filter(Boolean))];
  const uniqueGradYears = [...new Set(allUsers?.map(u => u.graduation_year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));

  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesVoicePart = filterVoicePart === 'all' || user.voice_part === filterVoicePart;
    const matchesGradYear = filterGradYear === 'all' || 
                           user.graduation_year?.toString() === filterGradYear;
    
    return matchesSearch && matchesRole && matchesVoicePart && matchesGradYear;
  }) || [];

  const memberUserIds = new Set(groupMembers?.map(member => member.user_id) || []);

  const handleAddMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await addMember.mutateAsync({ groupId, userId });
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await removeMember.mutateAsync({ groupId, userId });
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleDirectMessage = async (userId: string) => {
    console.log('handleDirectMessage called with userId:', userId);
    try {
      const conversation = await createDirectMessage.mutateAsync(userId);
      console.log('Direct message conversation created:', conversation);
      onSelectUser?.(conversation.id);
    } catch (error: any) {
      console.error('Failed to create direct message:', error);
      console.error('Error details:', error?.message, error?.code, error?.details);
    }
  };

  const handleBulkAddMembers = async () => {
    if (!groupId || selectedUsers.size === 0) return;
    
    try {
      // Add all selected users
      const promises = Array.from(selectedUsers).map(userId =>
        addMember.mutateAsync({ groupId, userId })
      );
      await Promise.all(promises);
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Failed to add members:', error);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSelectByCategory = (category: 'role' | 'voice_part' | 'grad_year', value: string) => {
    const usersToSelect = filteredUsers.filter(user => {
      switch (category) {
        case 'role':
          return user.role === value;
        case 'voice_part':
          return user.voice_part === value;
        case 'grad_year':
          return user.graduation_year?.toString() === value;
        default:
          return false;
      }
    }).map(u => u.user_id);
    
    setSelectedUsers(new Set(usersToSelect));
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={selectionMode} onValueChange={(value) => setSelectionMode(value as 'individual' | 'bulk')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual">Individual Selection</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Selection</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterVoicePart} onValueChange={setFilterVoicePart}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Voice Part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parts</SelectItem>
                  {uniqueVoiceParts.map(part => (
                    <SelectItem key={part} value={part}>{part}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterGradYear} onValueChange={setFilterGradYear}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Grad Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueGradYears.map(year => (
                    <SelectItem key={year} value={year?.toString() || ''}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Members */}
          {groupId && groupMembers && groupMembers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Members ({groupMembers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {groupMembers.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user_profile?.avatar_url} />
                            <AvatarFallback>
                              {getUserInitials(member.user_profile?.full_name, member.user_profile?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {member.user_profile?.full_name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.role}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removeMember.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Available Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {groupId ? 'Add Members' : 'All Users'} ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredUsers.map(user => {
                    const isMember = memberUserIds.has(user.user_id);
                    
                    return (
                      <div key={user.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {getUserInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {user.full_name || user.email}
                            </div>
                            <div className="text-xs text-muted-foreground flex gap-2">
                              <span>{user.email}</span>
                              {user.voice_part && <span>• {user.voice_part}</span>}
                              {user.graduation_year && <span>• {user.graduation_year}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {user.role && (
                              <Badge variant="secondary" className="text-xs">
                                {user.role}
                              </Badge>
                            )}
                            {isMember && (
                              <Badge variant="default" className="text-xs">
                                Member
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          {showDirectMessage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDirectMessage(user.user_id)}
                              disabled={createDirectMessage.isPending}
                              title="Send direct message"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {groupId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => isMember ? handleRemoveMember(user.user_id) : handleAddMember(user.user_id)}
                              disabled={addMember.isPending || removeMember.isPending}
                            >
                              {isMember ? (
                                <UserMinus className="h-4 w-4 text-destructive" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found matching current filters
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          {/* Quick Selection Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Select by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">By Role:</label>
                <div className="flex flex-wrap gap-1">
                  {uniqueRoles.map(role => (
                    <Button
                      key={role}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectByCategory('role', role)}
                      className="h-6 text-xs"
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium mb-1 block">By Voice Part:</label>
                <div className="flex flex-wrap gap-1">
                  {uniqueVoiceParts.map(part => (
                    <Button
                      key={part}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectByCategory('voice_part', part)}
                      className="h-6 text-xs"
                    >
                      {part}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium mb-1 block">By Graduation Year:</label>
                <div className="flex flex-wrap gap-1">
                  {uniqueGradYears.slice(0, 8).map(year => (
                    <Button
                      key={year}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectByCategory('grad_year', year?.toString() || '')}
                      className="h-6 text-xs"
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Users */}
          {selectedUsers.size > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Selected Users ({selectedUsers.size})
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUsers(new Set())}
                    >
                      Clear All
                    </Button>
                    {groupId && (
                      <Button
                        size="sm"
                        onClick={handleBulkAddMembers}
                        disabled={addMember.isPending}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Add Selected
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {Array.from(selectedUsers).map(userId => {
                      const user = allUsers?.find(u => u.user_id === userId);
                      return (
                        <div key={userId} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={true}
                            onCheckedChange={(checked) => handleUserSelection(userId, checked as boolean)}
                          />
                          <span>{user?.full_name || user?.email}</span>
                          {user?.voice_part && <Badge variant="secondary" className="text-xs">{user.voice_part}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* User List with Checkboxes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">All Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredUsers.map(user => {
                    const isMember = memberUserIds.has(user.user_id);
                    const isSelected = selectedUsers.has(user.user_id);
                    
                    return (
                      <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleUserSelection(user.user_id, checked as boolean)}
                          disabled={isMember}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {getUserInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{user.role}</span>
                            {user.voice_part && <span>• {user.voice_part}</span>}
                            {user.graduation_year && <span>• {user.graduation_year}</span>}
                          </div>
                        </div>
                        {isMember && (
                          <Badge variant="default" className="text-xs">
                            Member
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};