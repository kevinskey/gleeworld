import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, UserCheck, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlumnaeBulkImport } from './AlumnaeBulkImport';

export const AlumnaeUserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlumnaeUsers();
  }, []);

  const fetchAlumnaeUsers = async () => {
    try {
      // Query from secure user_roles table instead of gw_profiles.role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'alumna');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setUsers([]);
        return;
      }

      const alumnaUserIds = roleData.map(r => r.user_id);

      // Fetch full profile data for these users
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('*')
        .in('user_id', alumnaUserIds)
        .order('full_name', { ascending: true });

      if (profileError) throw profileError;
      setUsers(profileData || []);
    } catch (error: any) {
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMentorStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({
          is_mentor: !currentStatus,
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Mentor status updated');
      fetchAlumnaeUsers();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const normalizedSearch = search.toLowerCase().trim();
  const filteredUsers = users.filter((user) => {
    const name = (user.full_name ?? '').toString().toLowerCase();
    const email = (user.email ?? '').toString().toLowerCase();
    return name.includes(normalizedSearch) || email.includes(normalizedSearch);
  });

  return (
    <div className="space-y-6">
      <AlumnaeBulkImport />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alumnae User Management</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading alumnae...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Alumnae Found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'No alumnae match your search criteria.' : 'No users have been assigned the alumna role yet.'}
              </p>
              {!search && (
                <p className="text-sm text-muted-foreground">
                  Assign the "alumna" role to users in the main User Management to see them here.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Graduation Year</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.profile_image_url} />
                          <AvatarFallback>{user.full_name?.[0] || 'A'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.graduation_year || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_mentor && <Badge variant="secondary">Mentor</Badge>}
                    </TableCell>
                    <TableCell>
                      {user.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMentorStatus(user.id, user.is_mentor)}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          {user.is_mentor ? 'Remove Mentor' : 'Make Mentor'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
    </Card>
    </div>
  );
};
