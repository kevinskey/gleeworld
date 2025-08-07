import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, Filter, Mail, Phone } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useState } from 'react';

const MemberDirectory = () => {
  const { users, loading, error } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super-admin':
        return 'bg-red-100 text-red-800';
      case 'executive':
        return 'bg-purple-100 text-purple-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'alumna':
        return 'bg-green-100 text-green-800';
      case 'fan':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </UniversalLayout>
    );
  }

  if (error) {
    return (
      <UniversalLayout>
        <div className="text-center text-red-600 p-8">
          <p>Error loading member directory: {error}</p>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <PageHeader
        title="Glee World Directory"
        description="Browse and connect with Glee Club members across all roles and generations"
        showBackButton={true}
        backTo="/"
        backgroundVariant="gradient"
      />
      <div className="container mx-auto p-6 space-y-6">

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Roles</option>
                <option value="member">Members</option>
                <option value="alumna">Alumnae</option>
                <option value="executive">Executive Board</option>
                <option value="admin">Administrators</option>
                <option value="fan">Fans</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} members
            </div>
          </CardContent>
        </Card>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.full_name?.split(' ').map(n => n[0]).join('') || user.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {user.full_name || 'No name provided'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role || 'user'}
                      </Badge>
                      {user.is_exec_board && (
                        <Badge variant="outline">
                          Executive Board
                        </Badge>
                      )}
                      {user.voice_part && (
                        <Badge variant="secondary">
                          {user.voice_part}
                        </Badge>
                      )}
                    </div>
                    {user.class_year && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Class of {user.class_year}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  {user.email && (
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  )}
                  {user.phone && (
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No members found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </UniversalLayout>
  );
};

export default MemberDirectory;