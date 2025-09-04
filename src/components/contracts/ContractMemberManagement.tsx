import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Plus, 
  UserMinus, 
  Search, 
  Users,
  Mail
} from "lucide-react";
import { Contract, ContractMember, useContractManagement } from '@/hooks/useContractManagement';
import { supabase } from '@/integrations/supabase/client';

interface ContractMemberManagementProps {
  contract: Contract;
  onClose: () => void;
}

interface User {
  user_id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
}

export const ContractMemberManagement = ({ 
  contract, 
  onClose 
}: ContractMemberManagementProps) => {
  const { assignMember, removeMember, getContractMembers } = useContractManagement();
  const [members, setMembers] = useState<ContractMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  useEffect(() => {
    fetchMembers();
    fetchAvailableUsers();
  }, [contract.id]);

  const fetchMembers = async () => {
    const contractMembers = await getContractMembers(contract.id);
    setMembers(contractMembers);
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, avatar_url')
        .neq('user_id', contract.created_by);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAssignMember = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      await assignMember(contract.id, selectedUser, selectedRole);
      await fetchMembers();
      setSelectedUser('');
      setSelectedRole('member');
    } catch (error) {
      console.error('Error assigning member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      setLoading(true);
      await removeMember(contract.id, userId);
      await fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user => {
    const isAlreadyMember = members.some(member => member.user_id === user.user_id);
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  });

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contract
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Member Management</h1>
            <p className="text-muted-foreground">{contract.title}</p>
          </div>
        </div>
      </div>

      {/* Assign New Member */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Assign New Member
          </CardTitle>
          <CardDescription>
            Add team members to this contract
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search-users">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-users"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-32">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Users */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                {searchTerm ? 'No users found matching your search.' : 'All users are already assigned to this contract.'}
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser === user.user_id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedUser(user.user_id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {user.full_name || 'No name provided'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedUser === user.user_id}
                    readOnly
                    className="text-primary"
                  />
                </div>
              ))
            )}
          </div>

          <Button 
            onClick={handleAssignMember} 
            disabled={!selectedUser || loading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Member
          </Button>
        </CardContent>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Members
            <Badge variant="outline">{members.length}</Badge>
          </CardTitle>
          <CardDescription>
            People assigned to this contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No members assigned</h3>
              <p className="text-muted-foreground">
                Start by assigning team members to this contract.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {getInitials(member.user?.full_name, member.user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.full_name || 'No name provided'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned {new Date(member.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(member.role)}>
                      {member.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};