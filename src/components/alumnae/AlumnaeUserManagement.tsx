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

export const AlumnaeUserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlumnaeUsers();
  }, []);

  const fetchAlumnaeUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('role', 'alumna')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMentorStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('alumnae_users')
        .upsert({
          user_id: userId,
          is_mentor: !currentStatus,
        });

      if (error) throw error;
      toast.success('Mentor status updated');
      fetchAlumnaeUsers();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
      </CardContent>
    </Card>
  );
};
