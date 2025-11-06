import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, UserCheck, Star, Mail, Phone, MapPin, GraduationCap, Briefcase, Calendar, Globe, Heart, Music, Award, MoreVertical, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlumnaeBulkImport } from './AlumnaeBulkImport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AlumnaeUserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  useEffect(() => {
    fetchAlumnaeUsers();
  }, []);

  const fetchAlumnaeUsers = async () => {
    try {
      // Prefer user_roles table, but fall back to gw_profiles.role to be backward compatible
      const [{ data: roleData, error: roleError }, { data: profileRoleData, error: profileRoleError }] = await Promise.all([
        supabase.from('user_roles').select('user_id').eq('role', 'alumna'),
        supabase.from('gw_profiles').select('user_id').eq('role', 'alumna')
      ]);

      if (roleError) throw roleError;
      if (profileRoleError) throw profileRoleError;

      const idsFromRoles = (roleData || []).map(r => r.user_id);
      const idsFromProfiles = (profileRoleData || []).map(r => r.user_id);
      const uniqueIds = Array.from(new Set([...idsFromRoles, ...idsFromProfiles]));

      if (uniqueIds.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch full profile data for these users
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('*')
        .in('user_id', uniqueIds)
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

  const toggleFeaturedStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({
          is_featured: !currentStatus,
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Featured status updated');
      fetchAlumnaeUsers();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const normalizedSearch = search.toLowerCase().trim();
  const filteredUsers = users.filter((user) => {
    const name = (user.full_name ?? '').toString().toLowerCase();
    const email = (user.email ?? '').toString().toLowerCase();
    const major = (user.major ?? '').toString().toLowerCase();
    const employer = (user.current_employer ?? '').toString().toLowerCase();
    return name.includes(normalizedSearch) || email.includes(normalizedSearch) || major.includes(normalizedSearch) || employer.includes(normalizedSearch);
  });

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredUsers.map((user) => (
        <Card key={user.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-purple-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                  <AvatarImage src={user.profile_image_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {user.full_name?.[0] || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{user.full_name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    {user.is_mentor && <Badge variant="secondary" className="text-xs"><UserCheck className="h-3 w-3 mr-1" />Mentor</Badge>}
                    {user.is_featured && <Badge variant="default" className="text-xs bg-yellow-500"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toggleMentorStatus(user.id, user.is_mentor)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    {user.is_mentor ? 'Remove Mentor' : 'Make Mentor'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleFeaturedStatus(user.id, user.is_featured)}>
                    <Star className="h-4 w-4 mr-2" />
                    {user.is_featured ? 'Unfeature' : 'Feature'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* Contact Information */}
            <div className="space-y-2">
              {user.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              {(user.city || user.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{[user.city, user.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Academic & Professional Info */}
            <div className="space-y-2 pt-2 border-t">
              {user.graduation_year && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>Class of {user.graduation_year}</span>
                </div>
              )}
              {user.major && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{user.major}</span>
                </div>
              )}
              {user.current_employer && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{user.current_employer}</span>
                </div>
              )}
              {user.current_position && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="ml-6 truncate">{user.current_position}</span>
                </div>
              )}
            </div>

            {/* Glee Club Info */}
            {(user.voice_part || user.section_leader) && (
              <div className="space-y-2 pt-2 border-t">
                {user.voice_part && (
                  <div className="flex items-center gap-2 text-sm">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span>{user.voice_part}</span>
                    {user.section_leader && <Badge variant="outline" className="text-xs">Section Leader</Badge>}
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {user.bio && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground line-clamp-3">{user.bio}</p>
              </div>
            )}

            {/* Social Links */}
            {(user.linkedin_url || user.instagram_handle || user.website_url) && (
              <div className="flex gap-2 pt-2 border-t">
                {user.linkedin_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-3 w-3 mr-1" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                {user.website_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={user.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-3 w-3 mr-1" />
                      Website
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alumna</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Academic</TableHead>
            <TableHead>Professional</TableHead>
            <TableHead>Status</TableHead>
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
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    {user.voice_part && <div className="text-sm text-muted-foreground">{user.voice_part}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{user.email}</div>
                  {user.phone && <div className="text-sm text-muted-foreground">{user.phone}</div>}
                  {(user.city || user.state) && (
                    <div className="text-sm text-muted-foreground">
                      {[user.city, user.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {user.graduation_year && (
                    <Badge variant="outline">Class of {user.graduation_year}</Badge>
                  )}
                  {user.major && <div className="text-sm text-muted-foreground">{user.major}</div>}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {user.current_employer && <div className="text-sm font-medium">{user.current_employer}</div>}
                  {user.current_position && <div className="text-sm text-muted-foreground">{user.current_position}</div>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {user.is_mentor && <Badge variant="secondary" className="text-xs">Mentor</Badge>}
                  {user.is_featured && <Badge className="text-xs bg-yellow-500">Featured</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toggleMentorStatus(user.id, user.is_mentor)}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {user.is_mentor ? 'Remove Mentor' : 'Make Mentor'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleFeaturedStatus(user.id, user.is_featured)}>
                      <Star className="h-4 w-4 mr-2" />
                      {user.is_featured ? 'Unfeature' : 'Feature'}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <AlumnaeBulkImport />
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Alumnae User Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all alumnae profiles, contact information, and status
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, major, employer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 border-0 p-0 focus-visible:ring-0"
                />
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')} className="w-auto">
                <TabsList>
                  <TabsTrigger value="cards" className="text-xs">Cards</TabsTrigger>
                  <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
                </TabsList>
              </Tabs>
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
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} alumnae
              </div>
              {viewMode === 'cards' ? renderCardView() : renderTableView()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
