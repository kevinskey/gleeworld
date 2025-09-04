import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar,
  Shirt,
  Package,
  AlertCircle,
  Upload
} from 'lucide-react';
import { CSVUserImport } from './CSVUserImport';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  voicePart: string;
  currentCheckouts: number;
  overdueItems: number;
  lastCheckout?: string;
  status: 'active' | 'inactive' | 'on-leave';
}

export const WardrobeMemberManagement = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const { toast } = useToast();

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch member profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('*')
        .in('role', ['member', 'alumna', 'executive']);

      if (profilesError) throw profilesError;

      // Fetch wardrobe checkouts to get current checkout counts
      const { data: checkouts, error: checkoutsError } = await supabase
        .from('wardrobe_checkouts')
        .select('user_id, status, due_date, checked_out_at')
        .eq('status', 'checked_out');

      if (checkoutsError) throw checkoutsError;

      // Transform data to match our interface
      const transformedMembers: Member[] = (profiles || []).map(profile => {
        const userCheckouts = checkouts?.filter(checkout => checkout.user_id === profile.user_id) || [];
        const currentCheckouts = userCheckouts.length;
        const overdueItems = userCheckouts.filter(checkout => 
          checkout.due_date && new Date(checkout.due_date) < new Date()
        ).length;

        return {
          id: profile.user_id,
          name: profile.full_name || profile.email,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar_url,
          role: profile.role === 'executive' ? 'Executive Board' : 
                profile.role === 'alumna' ? 'Alumna' : 'Member',
          voicePart: profile.voice_part || 'Not Set',
          currentCheckouts,
          overdueItems,
          lastCheckout: userCheckouts[0]?.checked_out_at,
          status: profile.verified ? 'active' : 'inactive'
        };
      });

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to load member data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.voicePart.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on-leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h2 className="pt-4 text-2xl font-semibold flex items-center gap-2 mb-2">
            <Users className="h-6 w-6" />
            Member Management
          </h2>
          <p className="text-muted-foreground">
            Manage wardrobe access, checkouts, and member information
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCSVImport(!showCSVImport)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Active in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Checkouts</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.reduce((sum, member) => sum + member.currentCheckouts, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Items currently out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {members.reduce((sum, member) => sum + member.overdueItems, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {members.filter(m => m.status === 'on-leave').length}
            </div>
            <p className="text-xs text-muted-foreground">Temporarily away</p>
          </CardContent>
        </Card>
      </div>

      {/* CSV Import Section */}
      {showCSVImport && (
        <CSVUserImport />
      )}

      {/* Member List */}
      <Card className="shadow-sm border-0 bg-background">
        <CardHeader className="pb-4 lg:pb-6 px-6 lg:px-8">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3 text-lg lg:text-xl">
            <div className="flex items-center gap-2 lg:gap-3">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              <span>Members</span>
            </div>
            <Badge variant="secondary" className="px-2 lg:px-3 py-1 text-xs lg:text-sm w-fit">
              {filteredMembers.length} members
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading members...</div>
            </div>
          ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{member.name}</h3>
                      <Badge variant="outline" className={getStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                      <span className="font-medium">{member.voicePart}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-2">
                      <Shirt className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{member.currentCheckouts}</span>
                      <span className="text-muted-foreground">checked out</span>
                    </div>
                    {member.overdueItems > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">{member.overdueItems}</span>
                        <span>overdue</span>
                      </div>
                    )}
                  </div>
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredMembers.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No members found matching your criteria.</p>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};